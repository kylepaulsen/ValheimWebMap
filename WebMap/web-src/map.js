import ui from './ui';
import constants from "./constants";
import onPointers from "./onPointers";

const { canvas } = ui;

const width = constants.CANVAS_WIDTH;
const height = constants.CANVAS_HEIGHT;
const exploreRadius = constants.EXPLORE_RADIUS;
const pixelSize = constants.PIXEL_SIZE;
const coordOffset = constants.COORD_OFFSET;

// preload map icons.
const mapIconImage = document.createElement('img');
mapIconImage.src = 'mapIcons.png';

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

const mapIcons = [];

const createIconEl = (iconObj) => {
	const iconEl = document.createElement('div');
	iconEl.id = iconObj.id;
	iconEl.className = `mapIcon ${iconObj.type}`;
	const iconTextEl = document.createElement('div');
	iconTextEl.textContent = iconObj.text;
	iconEl.appendChild(iconTextEl);
	return iconEl;
};

const updateIcons = () => {
	const canvasOffsetScale = canvas.offsetWidth / width;

	mapIcons.forEach(iconObj => {
		let iconElement = document.getElementById(iconObj.id);
		if (!iconElement) {
			iconElement = createIconEl(iconObj);
			document.body.appendChild(iconElement);
		}
		const adjustX = (iconElement.offsetWidth / 2);
		const adjustY = (iconElement.offsetHeight / 2);
		const imgX = iconObj.x / pixelSize + coordOffset;
		const imgY = height - (iconObj.y / pixelSize + coordOffset);

		iconElement.style.left = (imgX * canvasOffsetScale + canvas.offsetLeft) - adjustX + 'px';
		iconElement.style.top = (imgY * canvasOffsetScale + canvas.offsetTop) - adjustY + 'px';
	});
};

const addIcon = (iconObj, update = true) => {
	if (!iconObj.id) {
		iconObj.id = `id_${Date.now()}_${Math.random()}`;
	}
	mapIcons.push(iconObj);
	if (update) {
		updateIcons();
	}
};

const removeIcon = (iconObj) => {
	mapIcons.splice(mapIcons.indexOf(iconObj), 1);
	const iconElement = document.getElementById(iconObj.id);
	if (iconElement) {
		iconElement.remove();
	}
};

const explore = (mapX, mapY) => {
	const radius = exploreRadius / pixelSize;
	const x = mapX / pixelSize + coordOffset;
	const y = height - (mapY / pixelSize + coordOffset);
	fogCanvasCtx.beginPath();
	fogCanvasCtx.arc(x, y, radius, 0, 2 * Math.PI, false);
	fogCanvasCtx.fill();
};

const redrawMap = () => {
	ctx.clearRect(0, 0, width, height);
	ctx.globalCompositeOperation = 'source-over';
	ctx.drawImage(mapImage, 0, 0);
	ctx.globalCompositeOperation = 'multiply';
	ctx.drawImage(fogCanvas, 0, 0);

	updateIcons();
};

const setZoom = function(zoomP) {
	const minZoom = 50;
	const maxZoom = 2000 * devicePixelRatio;
	zoomP = Math.min(Math.max(Math.round(zoomP), minZoom), maxZoom);
	currentZoom = zoomP;
	canvas.style.width = `${zoomP}%`;
};

const init = (options) => {
	mapImage = options.mapImage;
	fogImage = options.fogImage;

	fogCanvasCtx.drawImage(fogImage, 0, 0);

	redrawMap();

	const zoomChange = (e, mult = 1) => {
		const oldZoom = currentZoom;

		const zoomAmount = Math.max(Math.floor(oldZoom / 5), 1) * mult;
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
		updateIcons();
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
				updateIcons();
			} else if (pointers.length === 2) {
				const x1 = pointers[0].event.clientX;
				const y1 = pointers[0].event.clientY;
				const x2 = pointers[1].event.clientX;
				const y2 = pointers[1].event.clientY;
				const diffX = x1 - x2;
				const diffY = y1 - y2;
				const dist = Math.sqrt(diffX * diffX + diffY * diffY);
				if (lastZoomDist) {
					const diffDist = (lastZoomDist - dist) || -1;
					zoomChange({
						deltaY: diffDist,
						clientX: (x1 + x2) / 2,
						clientY: (y1 + y2) / 2
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
	addIcon,
	removeIcon,
	explore,
	update: redrawMap,
	updateIcons,
	canvas
};

