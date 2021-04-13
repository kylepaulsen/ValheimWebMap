import websocket from "./websocket";
import map from "./map";
import players from "./players";

const mapImage = document.createElement('img');
const fogImage = document.createElement('img');

const fetchMap = () => new Promise((res) => {
	fetch('/map').then(res => res.blob()).then((mapBlob) => {
		mapImage.onload = res;
		mapImage.src = URL.createObjectURL(mapBlob);
	});
});

const fetchFog = () => new Promise((res) => {
	fogImage.onload = res;
	fogImage.src = 'fog';
});

const setup = async () => {
	websocket.init();
	players.init();

	await Promise.all([
		fetchMap(),
		fetchFog()
	]);

	map.init({
		mapImage,
		fogImage
	});

	const pings = {};
	websocket.addActionListener('ping', (ping) => {
		let mapIcon = pings[ping.playerId];
		if (!mapIcon) {
			mapIcon = { ...ping };
			mapIcon.type = 'ping';
			mapIcon.text = ping.name;
			map.addIcon(mapIcon, false);
			pings[ping.playerId] = mapIcon;
		}
		mapIcon.x = ping.x;
		mapIcon.y = ping.y;
		map.updateIcons();

		clearTimeout(mapIcon.timeoutId);
		mapIcon.timeoutId = setTimeout(() => {
			delete pings[ping.playerId];
			map.removeIcon(mapIcon);
		}, 8000);
	});

	window.addEventListener('resize', () => {
		map.update();
	});
};

setup();
