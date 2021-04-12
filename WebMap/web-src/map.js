import ui from './ui';
import constants from "./constants";
import playerManager from "./players";
import websocket from "./websocket";
import onPointers from "./onPointers";

const { canvas } = ui;

const width = constants.CANVAS_WIDTH;
const height = constants.CANVAS_HEIGHT;
const exploreRadius = constants.EXPLORE_RADIUS;
const pixelSize = constants.PIXEL_SIZE;
const coordOffset = constants.COORD_OFFSET;

canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d');

canvas.style.width = "100%";
canvas.style.left = (window.innerWidth - canvas.offsetWidth) / 2 + 'px';
canvas.style.top = (window.innerHeight - canvas.offsetHeight) / 2 + 'px';

let mapImage;
let fogImage;
const fogCanvas = document.createElement('canvas');
fogCanvas.width = width;
fogCanvas.height = height;
const fogCanvasCtx = fogCanvas.getContext('2d');
fogCanvasCtx.fillStyle = '#ffffff';

let currentZoom = 100;

const updateFog = () => {
	const radius = exploreRadius / pixelSize;
	playerManager.players.forEach(player => {
		const x = player.x / pixelSize + coordOffset;
		const y = height - (player.y / pixelSize + coordOffset);
		fogCanvasCtx.beginPath();
		fogCanvasCtx.arc(x, y, radius, 0, 2 * Math.PI, false);
		fogCanvasCtx.fill();
	});
};

const redrawMap = () => {
	ctx.clearRect(0, 0, width, height);
	ctx.globalCompositeOperation = 'source-over';
	ctx.drawImage(mapImage, 0, 0);
	ctx.globalCompositeOperation = 'multiply';
	updateFog();
	ctx.drawImage(fogCanvas, 0, 0);
};

const setZoom = function(zoomP) {
	zoomP = Math.min(Math.max(Math.round(zoomP), 50), 2000);
	currentZoom = zoomP;
	canvas.style.width = `${zoomP}%`;
};

const init = (options) => {
	mapImage = options.mapImage;
	fogImage = options.fogImage;

	fogCanvasCtx.drawImage(fogImage, 0, 0);

	redrawMap();

	websocket.addActionListener('players', redrawMap);

	const zoomChange = (e, mult = 1) => {
		const oldZoom = currentZoom;

		const zoomAmount = Math.max(Math.floor(oldZoom / 5), 1) * mult;
		console.log(zoomAmount);
		const scrollAmt = e.deltaY === 0 ? e.deltaX : e.deltaY;
		if (scrollAmt > 0) {
			// zoom out.
			setZoom(oldZoom - zoomAmount);
		} else {
			// zoom in.
			setZoom(oldZoom + zoomAmount);
		}
		const zoomRatio = currentZoom / oldZoom;

		canvas.style.left = zoomRatio * (canvas.offsetLeft - e.clientX) + e.clientX + 'px';
		canvas.style.top = zoomRatio * (canvas.offsetTop - e.clientY) + e.clientY + 'px';
		playerManager.redrawPlayers();
	};

	window.addEventListener('wheel', zoomChange);

	const canvasPreDragPos = {};
	let isZooming = false;
	let lastZoomDist;
	onPointers(window, {
		down: (pointers) => {
			if (pointers.length === 1) {
				canvasPreDragPos.x = canvas.offsetLeft;
				canvasPreDragPos.y = canvas.offsetTop;
			} else if (pointers.length === 2) {
				isZooming = true;
				lastZoomDist = undefined;
			}
		},
		move: (pointers) => {
			if (pointers.length === 1 && !isZooming) {
				const e = pointers[0].event;
				canvas.style.left = canvasPreDragPos.x + (e.clientX - pointers[0].downEvent.clientX) + 'px';
				canvas.style.top = canvasPreDragPos.y + (e.clientY - pointers[0].downEvent.clientY) + 'px';
				playerManager.redrawPlayers();
			} else if (pointers.length === 2) {
				const diffX = pointers[0].event.clientX - pointers[1].event.clientX;
				const diffY = pointers[0].event.clientY - pointers[1].event.clientY;
				const dist = Math.sqrt(diffX * diffX + diffY * diffY);
				if (lastZoomDist) {
					const diffDist = (lastZoomDist - dist) || -1;
					zoomChange({
						deltaY: diffDist,
						clientX: window.innerWidth / 2,
						clientY: window.innerHeight / 2
					}, 0.08);
				}
				lastZoomDist = dist;
			}
		},
		up: (pointers) => {
			if (pointers.length === 0) {
				isZooming = false;
			}
		}
	});
};

export default {
	init,
	canvas
};

