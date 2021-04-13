import websocket from "./websocket";
import map from "./map";

const playerMapIcons = {};

const init = () => {
	websocket.addActionListener('players', (players) => {
		players.forEach((player) => {
			let playerMapIcon = playerMapIcons[player.id];
			if (!playerMapIcon) {
				playerMapIcon = { ...player, type: 'player', text: player.name };
				map.addIcon(playerMapIcon);
				playerMapIcons[player.id] = playerMapIcon;
			}
			playerMapIcon.lastUpdate = Date.now();
			playerMapIcon.x = player.x;
			playerMapIcon.y = player.y;
			map.explore(player.x, player.y);
		});
	});

	setInterval(() => {
		// clean up disconnected players.
		const now = Date.now();
		Object.keys(playerMapIcons).forEach((key) => {
			const playerMapIcon = playerMapIcons[key];
			if (now - playerMapIcon.lastUpdate > 5000) {
				map.removeIcon(playerMapIcon);
				delete playerMapIcons[key];
			}
		});
	}, 2000);

	map.addIcon({
		type: 'start',
		x: 0,
		y: 0
	});
};

export default {
	init
};
