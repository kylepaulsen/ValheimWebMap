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
	players.init({ canvas: map.canvas });

	await Promise.all([
		fetchMap(),
		fetchFog()
	]);

	map.init({
		mapImage,
		fogImage
	});
};

setup();
