
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.IO;
using System.Reflection;
using BepInEx;
using UnityEngine;
using HarmonyLib;
using static ZRoutedRpc;

namespace WebMap {
    //This attribute is required, and lists metadata for your plugin.
    //The GUID should be a unique ID for this plugin, which is human readable (as it is used in places like the config). I like to use the java package notation, which is "com.[your name here].[your plugin name here]"
    //The name is the name of the plugin that's displayed on load, and the version number just specifies what version the plugin is.
    [BepInPlugin("com.kylepaulsen.valheim.webmap", "WebMap", "1.0.3")]

    //This is the main declaration of our plugin class. BepInEx searches for all classes inheriting from BaseUnityPlugin to initialize on startup.
    //BaseUnityPlugin itself inherits from MonoBehaviour, so you can use this as a reference for what you can declare and use in your plugin class: https://docs.unity3d.com/ScriptReference/MonoBehaviour.html
    public class WebMap : BaseUnityPlugin {

        static readonly DateTime unixEpoch = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
        static readonly HashSet<string> ALLOWED_PINS = new HashSet<string> { "dot", "fire", "mine", "house", "cave" };

        static MapDataServer mapDataServer;
        static string worldDataPath;

        private bool fogTextureNeedsSaving = false;

        //The Awake() method is run at the very start when the game is initialized.
        public void Awake() {
            var harmony = new Harmony("com.kylepaulsen.valheim.webmap");
            Harmony.CreateAndPatchAll(Assembly.GetExecutingAssembly(), (string) null);

            var pluginPath = System.IO.Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            WebMapConfig.readConfigFile(Path.Combine(pluginPath, "config.json"));

            var mapDataPath = Path.Combine(pluginPath, "map_data");
            Directory.CreateDirectory(mapDataPath);
            worldDataPath = Path.Combine(mapDataPath, WebMapConfig.getWorldName());
            Directory.CreateDirectory(worldDataPath);

            mapDataServer = new MapDataServer();
            mapDataServer.ListenAsync();

            var mapImagePath = Path.Combine(worldDataPath, "map");
            try {
                mapDataServer.mapImageData = File.ReadAllBytes(mapImagePath);
            } catch (Exception e) {
                Debug.Log("WebMap: Failed to read map image data from disk. " + e.Message);
            }

            var fogImagePath = Path.Combine(worldDataPath, "fog.png");
            try {
                var fogTexture = new Texture2D(WebMapConfig.TEXTURE_SIZE, WebMapConfig.TEXTURE_SIZE);
                var fogBytes = File.ReadAllBytes(fogImagePath);
                fogTexture.LoadImage(fogBytes);
                mapDataServer.fogTexture = fogTexture;
            } catch (Exception e) {
                Debug.Log("WebMap: Failed to read fog image data from disk... Making new fog image..." + e.Message);
                var fogTexture = new Texture2D(WebMapConfig.TEXTURE_SIZE, WebMapConfig.TEXTURE_SIZE, TextureFormat.RGB24, false);
                var fogColors = new Color32[WebMapConfig.TEXTURE_SIZE * WebMapConfig.TEXTURE_SIZE];
                for (var t = 0; t < fogColors.Length; t++) {
                    fogColors[t] = Color.black;
                }
                fogTexture.SetPixels32(fogColors);
                var fogPngBytes = fogTexture.EncodeToPNG();

                mapDataServer.fogTexture = fogTexture;
                try {
                    File.WriteAllBytes(fogImagePath, fogPngBytes);
                } catch {
                    Debug.Log("WebMap: FAILED TO WRITE FOG FILE!");
                }
            }

            InvokeRepeating("UpdateFogTexture", WebMapConfig.UPDATE_FOG_TEXTURE_INTERVAL, WebMapConfig.UPDATE_FOG_TEXTURE_INTERVAL);
            InvokeRepeating("SaveFogTexture", WebMapConfig.SAVE_FOG_TEXTURE_INTERVAL, WebMapConfig.SAVE_FOG_TEXTURE_INTERVAL);

            var mapPinsFile = Path.Combine(worldDataPath, "pins.csv");
            try {
                var pinsLines = File.ReadAllLines(mapPinsFile);
                mapDataServer.pins = new List<string>(pinsLines);
            } catch (Exception e) {
                Debug.Log("WebMap: Failed to read pins.csv from disk. " + e.Message);
            }
        }

        public void UpdateFogTexture() {
            int pixelExploreRadius = (int)Mathf.Ceil(WebMapConfig.EXPLORE_RADIUS / WebMapConfig.PIXEL_SIZE);
            int pixelExploreRadiusSquared = pixelExploreRadius * pixelExploreRadius;
            var halfTextureSize = WebMapConfig.TEXTURE_SIZE / 2;

            mapDataServer.players.ForEach(player => {
                if (player.m_publicRefPos) {
                    ZDO zdoData = null;
                    try {
                        zdoData = ZDOMan.instance.GetZDO(player.m_characterID);
                    } catch {}
                    if (zdoData != null) {
                        var pos = zdoData.GetPosition();
                        var pixelX = Mathf.RoundToInt(pos.x / WebMapConfig.PIXEL_SIZE + halfTextureSize);
                        var pixelY = Mathf.RoundToInt(pos.z / WebMapConfig.PIXEL_SIZE + halfTextureSize);
                        for (var y = pixelY - pixelExploreRadius; y <= pixelY + pixelExploreRadius; y++) {
                            for (var x = pixelX - pixelExploreRadius; x <= pixelX + pixelExploreRadius; x++) {
                                if (y >= 0 && x >= 0 && y < WebMapConfig.TEXTURE_SIZE && x < WebMapConfig.TEXTURE_SIZE) {
                                    var xDiff = pixelX - x;
                                    var yDiff = pixelY - y;
                                    var currentExploreRadiusSquared = xDiff * xDiff + yDiff * yDiff;
                                    if (currentExploreRadiusSquared < pixelExploreRadiusSquared) {
                                        var fogTexColor = mapDataServer.fogTexture.GetPixel(x, y);
                                        if (fogTexColor.r < 1f) {
                                            fogTextureNeedsSaving = true;
                                            mapDataServer.fogTexture.SetPixel(x, y, Color.white);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }

        public void SaveFogTexture() {
            if (mapDataServer.players.Count > 0 && fogTextureNeedsSaving) {
                byte[] pngBytes = mapDataServer.fogTexture.EncodeToPNG();

                // Debug.Log("Saving fog file...");
                try {
                    File.WriteAllBytes(Path.Combine(worldDataPath, "fog.png"), pngBytes);
                    fogTextureNeedsSaving = false;
                } catch {
                    Debug.Log("WebMap: FAILED TO WRITE FOG FILE!");
                }
            }
        }

        public static void SavePins() {
            var mapPinsFile = Path.Combine(worldDataPath, "pins.csv");
            try {
                File.WriteAllLines(mapPinsFile, mapDataServer.pins);
            } catch {
                Debug.Log("WebMap: FAILED TO WRITE PINS FILE!");
            }
        }

        [HarmonyPatch(typeof (ZoneSystem), "Start")]
        private class ZoneSystemPatch {

            static readonly Color DeepWaterColor = new Color(0.36105883f, 0.36105883f, 0.43137255f);
            static readonly Color ShallowWaterColor = new Color(0.574f, 0.50709206f, 0.47892025f);
            static readonly Color ShoreColor = new Color(0.1981132f, 0.12241901f, 0.1503943f);

            static Color GetMaskColor(float wx, float wy, float height, Heightmap.Biome biome) {
                var noForest = new Color(0f, 0f, 0f, 0f);
                var forest = new Color(1f, 0f, 0f, 0f);

                if (height < ZoneSystem.instance.m_waterLevel) {
                    return noForest;
                }
                if (biome == Heightmap.Biome.Meadows) {
                    if (!WorldGenerator.InForest(new Vector3(wx, 0f, wy))) {
                        return noForest;
                    }
                    return forest;
                } else if (biome == Heightmap.Biome.Plains) {
                    if (WorldGenerator.GetForestFactor(new Vector3(wx, 0f, wy)) >= 0.8f) {
                        return noForest;
                    }
                    return forest;
                } else {
                    if (biome == Heightmap.Biome.BlackForest || biome == Heightmap.Biome.Mistlands) {
                        return forest;
                    }
                    return noForest;
                }
            }

            static Color GetPixelColor(Heightmap.Biome biome) {
                var m_meadowsColor = new Color(0.573f, 0.655f, 0.361f);
                var m_swampColor = new Color(0.639f, 0.447f, 0.345f);
                var m_mountainColor = new Color(1f, 1f, 1f);
                var m_blackforestColor = new Color(0.420f, 0.455f, 0.247f);
                var m_heathColor = new Color(0.906f, 0.671f, 0.470f);
                var m_ashlandsColor = new Color(0.690f, 0.192f, 0.192f);
                var m_deepnorthColor = new Color(1f, 1f, 1f);
                var m_mistlandsColor = new Color(0.325f, 0.325f, 0.325f);

                if (biome <= Heightmap.Biome.Plains) {
                    switch (biome) {
                        case Heightmap.Biome.Meadows:
                            return m_meadowsColor;
                        case Heightmap.Biome.Swamp:
                            return m_swampColor;
                        case (Heightmap.Biome)3:
                            break;
                        case Heightmap.Biome.Mountain:
                            return m_mountainColor;
                        default:
                            if (biome == Heightmap.Biome.BlackForest) {
                                return m_blackforestColor;
                            }
                            if (biome == Heightmap.Biome.Plains) {
                                return m_heathColor;
                            }
                            break;
                    }
                } else if (biome <= Heightmap.Biome.DeepNorth) {
                    if (biome == Heightmap.Biome.AshLands) {
                        return m_ashlandsColor;
                    }
                    if (biome == Heightmap.Biome.DeepNorth) {
                        return m_deepnorthColor;
                    }
                } else {
                    if (biome == Heightmap.Biome.Ocean) {
                        return Color.white;
                    }
                    if (biome == Heightmap.Biome.Mistlands) {
                        return m_mistlandsColor;
                    }
                }
                return Color.white;
            }

            static void Postfix(ZoneSystem __instance) {
                Vector3 startPos;
                ZoneSystem.instance.GetLocationIcon("StartTemple", out startPos);
                WebMapConfig.WORLD_START_POS = startPos;

                if (mapDataServer.mapImageData != null) {
                    Debug.Log("WebMap: MAP ALREADY BUILT!");
                    return;
                }
                Debug.Log("WebMap: BUILD MAP!");

                int num = WebMapConfig.TEXTURE_SIZE / 2;
                float num2 = WebMapConfig.PIXEL_SIZE / 2f;
                Color32[] colorArray = new Color32[WebMapConfig.TEXTURE_SIZE * WebMapConfig.TEXTURE_SIZE];
                Color32[] treeMaskArray = new Color32[WebMapConfig.TEXTURE_SIZE * WebMapConfig.TEXTURE_SIZE];
                float[] heightArray = new float[WebMapConfig.TEXTURE_SIZE * WebMapConfig.TEXTURE_SIZE];
                for (int i = 0; i < WebMapConfig.TEXTURE_SIZE; i++) {
                    for (int j = 0; j < WebMapConfig.TEXTURE_SIZE; j++) {
                        float wx = (float)(j - num) * WebMapConfig.PIXEL_SIZE + num2;
                        float wy = (float)(i - num) * WebMapConfig.PIXEL_SIZE + num2;
                        Heightmap.Biome biome = WorldGenerator.instance.GetBiome(wx, wy);
                        float biomeHeight = WorldGenerator.instance.GetBiomeHeight(biome, wx, wy);
                        colorArray[i * WebMapConfig.TEXTURE_SIZE + j] = GetPixelColor(biome);
                        treeMaskArray[i * WebMapConfig.TEXTURE_SIZE + j] = GetMaskColor(wx, wy, biomeHeight, biome);
                        heightArray[i * WebMapConfig.TEXTURE_SIZE + j] = biomeHeight;
                    }
                }

                var waterLevel = ZoneSystem.instance.m_waterLevel;
                var sunDir = new Vector3(-0.57735f, 0.57735f, 0.57735f);
                var newColors = new Color[colorArray.Length];

                for (var t = 0; t < colorArray.Length; t++) {
                    var h = heightArray[t];

                    var tUp = t - WebMapConfig.TEXTURE_SIZE;
                    if (tUp < 0) {
                        tUp = t;
                    }
                    var tDown = t + WebMapConfig.TEXTURE_SIZE;
                    if (tDown > colorArray.Length - 1) {
                        tDown = t;
                    }
                    var tRight = t + 1;
                    if (tRight > colorArray.Length - 1) {
                        tRight = t;
                    }
                    var tLeft = t - 1;
                    if (tLeft < 0) {
                        tLeft = t;
                    }
                    var hUp = heightArray[tUp];
                    var hRight = heightArray[tRight];
                    var hLeft = heightArray[tLeft];
                    var hDown = heightArray[tDown];

                    var va = new Vector3(2f, 0f, hRight - hLeft).normalized;
                    var vb = new Vector3(0f, 2f, hUp - hDown).normalized;
                    var normal = Vector3.Cross(va, vb);

                    var surfaceLight = Vector3.Dot(normal, sunDir) * 0.25f + 0.75f;

                    float shoreMask = Mathf.Clamp(h - waterLevel, 0, 1);
                    float shallowRamp = Mathf.Clamp((h - waterLevel + 0.2f * 12.5f) * 0.5f, 0, 1);
                    float deepRamp = Mathf.Clamp((h - waterLevel + 1f * 12.5f) * 0.1f, 0, 1);

                    var mapColor = colorArray[t];
                    Color ans = Color.Lerp(ShoreColor, mapColor, shoreMask);
                    ans = Color.Lerp(ShallowWaterColor, ans, shallowRamp);
                    ans = Color.Lerp(DeepWaterColor, ans, deepRamp);

                    newColors[t] = new Color(ans.r * surfaceLight, ans.g * surfaceLight, ans.b * surfaceLight, ans.a);
                }

                var newTexture = new Texture2D(WebMapConfig.TEXTURE_SIZE, WebMapConfig.TEXTURE_SIZE, TextureFormat.RGBA32, false);
                newTexture.SetPixels(newColors);
                byte[] pngBytes = newTexture.EncodeToPNG();

                mapDataServer.mapImageData = pngBytes;
                try {
                    File.WriteAllBytes(Path.Combine(worldDataPath, "map"), pngBytes);
                } catch {
                    Debug.Log("WebMap: FAILED TO WRITE MAP FILE!");
                }
                Debug.Log("WebMap: BUILDING MAP DONE!");
            }
        }

        [HarmonyPatch(typeof (ZNet), "Start")]
        private class ZNetPatch {
            static void Postfix(List<ZNetPeer> ___m_peers) {
                mapDataServer.players = ___m_peers;
            }
        }

        private static readonly int sayMethodHash = "Say".GetStableHashCode();
        private static readonly int chatMessageMethodHash = "ChatMessage".GetStableHashCode();

        [HarmonyPatch(typeof (ZRoutedRpc), "HandleRoutedRPC")]
        private class ZRoutedRpcPatch {
            static void Prefix(RoutedRPCData data) {
                ZNetPeer peer = ZNet.instance.GetPeer(data.m_senderPeerID);
                var steamid = "";
                try {
                    steamid = peer.m_rpc.GetSocket().GetHostName();
                } catch {}

                if (data?.m_methodHash == sayMethodHash) {
                    try {
                        var zdoData = ZDOMan.instance.GetZDO(peer.m_characterID);
                        var pos = zdoData.GetPosition();
                        ZPackage package = new ZPackage(data.m_parameters.GetArray());
                        int messageType = package.ReadInt();
                        string userName = package.ReadString();
                        string message = package.ReadString();
                        message = (message == null ? "" : message).Trim();

                        if (message.StartsWith("/pin")) {
                            var messageParts = message.Split(' ');
                            var pinType = "dot";
                            var startIdx = 1;
                            if (messageParts.Length > 1 && ALLOWED_PINS.Contains(messageParts[1])) {
                                pinType = messageParts[1];
                                startIdx = 2;
                            }
                            var pinText = "";
                            if (startIdx < messageParts.Length) {
                                pinText = String.Join(" ", messageParts, startIdx, messageParts.Length - startIdx);
                            }
                            if (pinText.Length > 20) {
                                pinText = pinText.Substring(0, 20);
                            }
                            var safePinsText = Regex.Replace(pinText, @"[^a-zA-Z0-9 ]", "");

                            var timestamp = DateTime.Now - unixEpoch;
                            var pinId = $"{timestamp.TotalMilliseconds}-{UnityEngine.Random.Range(1000, 9999)}";
                            mapDataServer.AddPin(steamid, pinId, pinType, userName, pos, safePinsText);

                            var usersPins = mapDataServer.pins.FindAll(pin => pin.StartsWith(steamid));
                            var numOverflowPins = usersPins.Count - WebMapConfig.MAX_PINS_PER_USER;
                            for (var t = numOverflowPins; t > 0; t--) {
                                var pinIdx = mapDataServer.pins.FindIndex(pin => pin.StartsWith(steamid));
                                mapDataServer.RemovePin(pinIdx);
                            }
                            SavePins();
                        } else if (message.StartsWith("/undoPin")) {
                            var pinIdx = mapDataServer.pins.FindLastIndex(pin => pin.StartsWith(steamid));
                            if (pinIdx > -1) {
                                mapDataServer.RemovePin(pinIdx);
                                SavePins();
                            }
                        } else if (message.StartsWith("/deletePin")) {
                            var messageParts = message.Split(' ');
                            var pinText = "";
                            if (messageParts.Length > 1) {
                                pinText = String.Join(" ", messageParts, 1, messageParts.Length - 1);
                            }

                            var pinIdx = mapDataServer.pins.FindLastIndex(pin => {
                                var pinParts = pin.Split(',');
                                return pinParts[0] == steamid && pinParts[pinParts.Length - 1] == pinText;
                            });

                            if (pinIdx > -1) {
                                mapDataServer.RemovePin(pinIdx);
                                SavePins();
                            }
                        }
                        //Debug.Log("SAY!!! " + messageType + " | " + userName + " | " + message);
                    } catch {}
                } else if (data?.m_methodHash == chatMessageMethodHash) {
                    try {
                        ZPackage package = new ZPackage(data.m_parameters.GetArray());
                        Vector3 pos = package.ReadVector3();
                        int messageType = package.ReadInt();
                        string userName = package.ReadString();
                        // string message = package.ReadString();
                        // message = (message == null ? "" : message).Trim();

                        if (messageType == 3) {
                            mapDataServer.BroadcastPing(data.m_senderPeerID, userName, pos);
                        }
                        // Debug.Log("CHAT!!! " + pos + " | " + messageType + " | " + userName + " | " + message);
                    } catch {}
                }
            }
        }
    }
}
