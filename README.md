# Valheim WebMap

This server side mod creates a web based map that shows live players and allows shared exploration. After port forwarding the correct port, you can share http://your_ip:port url to anyone else and they can see the map too. Clients do not need to have any mods installed.

## Installation

Place the WebMap directory in:

`Steam\steamapps\common\Valheim dedicated server\BepInEx\plugins\WebMap`

## Development

To get your environment working, you will need to find and place these .dll files in the WebMap/libs directory. These dlls are usually found in:

`Steam\steamapps\common\Valheim\valheim_server_Data\Managed`
* assembly_valheim.dll
* UnityEngine.CoreModule.dll
* UnityEngine.dll
* UnityEngine.ImageConversionModule.dll (This one might be harder to find. Try googling.)
* UnityEngine.UI.dll

## Licence

When applicable, assume stuff is under the MIT licence ( https://opensource.org/licenses/MIT )
I am not liable for any damages and there is no warranty etc...
