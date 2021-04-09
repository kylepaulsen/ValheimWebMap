using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Reflection;

using WebSocketSharp.Net;
using WebSocketSharp.Server;

using UnityEngine;

namespace WebMap {

    public class WebSocketHandler : WebSocketBehavior {
        public WebSocketHandler() {}
        // protected override void OnOpen() {
        //     Context.WebSocket.Send("hi " + ID);
        // }

        // protected override void OnClose(CloseEventArgs e) {
        // }

        // protected override void OnMessage(MessageEventArgs e) {
        //     Sessions.Broadcast(e.Data);
        // }
    }

    public class MapDataServer {
        static int SERVER_PORT = 3000;
        static double PLAYER_UPDATE_RATE = 0.5;
        static bool CACHE_FILES = true;

        private HttpServer httpServer;
        private string publicRoot;
        private Dictionary<string, byte[]> fileCache;
        private Timer broadcastTimer;
        private WebSocketServiceHost webSocketHandler;

        public byte[] mapImageData;
        public Texture2D fogTexture;
        public List<ZNetPeer> players = new List<ZNetPeer>();

        static Dictionary<string, string> contentTypes = new Dictionary<string, string>() {
            { "html", "text/html" },
            { "js", "text/javascript" },
            { "css", "text/css" },
            { "png", "image/png" }
        };

        public MapDataServer() {
            httpServer = new HttpServer(SERVER_PORT);
            httpServer.AddWebSocketService<WebSocketHandler>("/");
            httpServer.KeepClean = true;

            webSocketHandler = httpServer.WebSocketServices["/"];

            broadcastTimer = new Timer((e) => {
                var dataString = "";
                players.ForEach(player => {
                    var zdoData = ZDOMan.instance.GetZDO(player.m_characterID);
                    var pos = zdoData.GetPosition();
                    if (player.m_publicRefPos) {
                        dataString += $"{player.m_uid}\n{player.m_playerName}\n{pos.x}\n{pos.z}\n";
                    } else {
                        dataString += $"{player.m_uid}\n{player.m_playerName}\nhidden\nhidden\n";
                    }
                });
                if (dataString.Length > 0) {
                    webSocketHandler.Sessions.Broadcast("players\n" + dataString);
                }
            }, null, TimeSpan.Zero, TimeSpan.FromSeconds(PLAYER_UPDATE_RATE));

            publicRoot = Path.Combine(System.IO.Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), "web");

            fileCache = new Dictionary<string, byte[]>();

            httpServer.OnGet += (sender, e) => {
                var req = e.Request;
                Debug.Log("~~~ Got GET Request for: " + req.RawUrl);

                if (ProcessSpecialRoutes(e)) {
                    return;
                }

                ServeStaticFiles(e);
            };
        }

        public void Stop() {
            broadcastTimer.Dispose();
            httpServer.Stop();
        }

        private void ServeStaticFiles(HttpRequestEventArgs e) {
            var req = e.Request;
            var res = e.Response;

            var rawRequestPath = req.RawUrl;
            if (rawRequestPath == "/") {
                rawRequestPath = "/index.html";
            }

            var pathParts = rawRequestPath.Split('/');
            var requestedFile = pathParts[pathParts.Length - 1];
            var fileParts = requestedFile.Split('.');
            var fileExt = fileParts[fileParts.Length - 1];

            if (contentTypes.ContainsKey(fileExt)) {
                byte[] requestedFileBytes = new byte[0];
                if (fileCache.ContainsKey(requestedFile)) {
                    requestedFileBytes = fileCache[requestedFile];
                } else {
                    var filePath = Path.Combine(publicRoot, requestedFile);
                    try {
                        requestedFileBytes = File.ReadAllBytes(filePath);
                        if (CACHE_FILES) {
                            fileCache.Add(requestedFile, requestedFileBytes);
                        }
                    } catch (Exception ex) {
                        Debug.Log("FAILED TO READ FILE! " + ex.Message);
                    }
                }

                if (requestedFileBytes.Length > 0) {
                    res.Headers.Add(HttpResponseHeader.CacheControl, "public, max-age=604800, immutable");
                    res.ContentType = contentTypes[fileExt];
                    res.StatusCode = 200;
                    res.ContentLength64 = requestedFileBytes.Length;
                    res.Close(requestedFileBytes, true);
                } else {
                    res.StatusCode = 404;
                    res.Close();
                }
            } else {
                res.StatusCode = 404;
                res.Close();
            }
        }

        private bool ProcessSpecialRoutes(HttpRequestEventArgs e) {
            var req = e.Request;
            var res = e.Response;
            var rawRequestPath = req.RawUrl;

            switch(rawRequestPath) {
                case "/map":
                    // Doing things this way to make the full map harder to accidentally see.
                    res.Headers.Add(HttpResponseHeader.CacheControl, "public, max-age=604800, immutable");
                    res.ContentType = "application/octet-stream";
                    res.StatusCode = 200;
                    res.ContentLength64 = mapImageData.Length;
                    res.Close(mapImageData, true);
                    return true;
                case "/fog":
                    res.Headers.Add(HttpResponseHeader.CacheControl, "no-cache");
                    res.ContentType = "image/png";
                    res.StatusCode = 200;
                    var fogBytes = fogTexture.EncodeToPNG();
                    res.ContentLength64 = fogBytes.Length;
                    res.Close(fogBytes, true);
                    return true;
            }
            return false;
        }

        public void ListenAsync() {
            httpServer.Start();

            if (httpServer.IsListening) {
                Debug.Log($"~~~ HTTP Server Listening on port {SERVER_PORT} ~~~");
            } else {
                Debug.Log("!!! HTTP Server Failed To Start !!!");
            }
        }
    }
}
