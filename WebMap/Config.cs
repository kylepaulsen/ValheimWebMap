using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using TinyJson;

namespace WebMap {

    static class WebMapConfig {

        public static int TEXTURE_SIZE = 2048;
        public static int PIXEL_SIZE = 12;
        public static float EXPLORE_RADIUS = 100f;
        public static float UPDATE_FOG_TEXTURE_INTERVAL = 1f;
        public static float SAVE_FOG_TEXTURE_INTERVAL = 30f;
        public static int MAX_PINS_PER_USER = 50;

        public static int SERVER_PORT = 3000;
        public static double PLAYER_UPDATE_INTERVAL = 0.5;
        public static bool CACHE_SERVER_FILES = false;

        public static TValue GetValueOrDefault<TKey, TValue>(
            this IDictionary<TKey, TValue> dictionary, TKey key, TValue defaultValue) {

            TValue value;
            return dictionary.TryGetValue(key, out value) ? value : defaultValue;
        }

        public static void readConfigFile(string configFile) {
            string fileJson = "";
            try {
                fileJson = File.ReadAllText(configFile);
            } catch {
                System.Console.WriteLine("~~~ WebMap: FAILED TO READ CONFIG FILE AT: " + configFile);
                System.Environment.Exit(1);
            }

            var configJson = (Dictionary<string, object>)fileJson.FromJson<object>();

            if (configJson == null) {
                System.Console.WriteLine("~~~ WebMap: FAILED TO PARSE CONFIG FILE AT: " + configFile + " . INVALID SYNTAX?");
                System.Environment.Exit(1);
            }

            try {
                TEXTURE_SIZE = (int)configJson.GetValueOrDefault("texture_size", 2048);
            } catch {
                System.Console.WriteLine("~~~ WebMap: FAILED TO PARSE texture_size VALUE IN CONFIG FILE AT: " + configFile + " . INVALID TYPE?");
            }

            try {
                PIXEL_SIZE = (int)configJson.GetValueOrDefault("pixel_size", 12);
            } catch {
                System.Console.WriteLine("~~~ WebMap: FAILED TO PARSE pixel_size VALUE IN CONFIG FILE AT: " + configFile + " . INVALID TYPE?");
            }

            try {
                EXPLORE_RADIUS = (float)Convert.ToDouble(configJson.GetValueOrDefault("explore_radius", 100f));
            } catch {
                System.Console.WriteLine("~~~ WebMap: FAILED TO PARSE explore_radius VALUE IN CONFIG FILE AT: " + configFile + " . INVALID TYPE?");
            }

            try {
                UPDATE_FOG_TEXTURE_INTERVAL = (float)Convert.ToDouble(configJson.GetValueOrDefault("update_fog_texture_interval", 1f));
            } catch {
                System.Console.WriteLine("~~~ WebMap: FAILED TO PARSE update_fog_texture_interval VALUE IN CONFIG FILE AT: " + configFile + " . INVALID TYPE?");
            }

            try {
                SAVE_FOG_TEXTURE_INTERVAL = (float)Convert.ToDouble(configJson.GetValueOrDefault("save_fog_texture_interval", 30f));
            } catch {
                System.Console.WriteLine("~~~ WebMap: FAILED TO PARSE save_fog_texture_interval VALUE IN CONFIG FILE AT: " + configFile + " . INVALID TYPE?");
            }

            try {
                MAX_PINS_PER_USER = (int)configJson.GetValueOrDefault("max_pins_per_user", 50);
            } catch {
                System.Console.WriteLine("~~~ WebMap: FAILED TO PARSE max_pins_per_user VALUE IN CONFIG FILE AT: " + configFile + " . INVALID TYPE?");
            }

            try {
                SERVER_PORT = (int)configJson.GetValueOrDefault("server_port", 3000);
            } catch {
                System.Console.WriteLine("~~~ WebMap: FAILED TO PARSE server_port VALUE IN CONFIG FILE AT: " + configFile + " . INVALID TYPE?");
            }

            try {
                PLAYER_UPDATE_INTERVAL = Convert.ToDouble(configJson.GetValueOrDefault("player_update_interval", 0.5));
            } catch {
                System.Console.WriteLine("~~~ WebMap: FAILED TO PARSE player_update_interval VALUE IN CONFIG FILE AT: " + configFile + " . INVALID TYPE?");
            }

            try {
                CACHE_SERVER_FILES = (bool)configJson.GetValueOrDefault("cache_server_files", true);
            } catch {
                System.Console.WriteLine("~~~ WebMap: FAILED TO PARSE cache_server_files VALUE IN CONFIG FILE AT: " + configFile + " . INVALID TYPE?");
            }
        }

        public static string makeClientConfigJSON() {
            var sb = new StringBuilder();
            sb.Length = 0;

            sb.Append("{");
            sb.Append($"\"texture_size\":{TEXTURE_SIZE},");
            sb.Append($"\"pixel_size\":{PIXEL_SIZE},");
            sb.Append($"\"update_interval\":{PLAYER_UPDATE_INTERVAL},");
            sb.Append($"\"explore_radius\":{EXPLORE_RADIUS}");
            sb.Append("}");

            return sb.ToString();
        }
    }
}
