import ui from './ui';
import constants from "./constants";
import onPointers from "./onPointers";

const { canvas, map } = ui;

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

map.style.width = '100%';
map.style.height = map.offsetWidth + 'px';
map.style.left = (window.innerWidth - map.offsetWidth) / 2 + 'px';
map.style.top = (window.innerHeight - map.offsetHeight) / 2 + 'px';

let mapImage;
let fogImage;
const fogCanvas = document.createElement('canvas');
fogCanvas.width = width;
fogCanvas.height = height;
const fogCanvasCtx = fogCanvas.getContext('2d');
fogCanvasCtx.fillStyle = '#ffffff';

let currentZoom = 100;

const mapIcons = [];
const hiddenIcons = {};

const createIconEl = (iconObj) => {
	const iconEl = document.createElement('div');
	iconEl.id = iconObj.id;
	iconEl.className = `mapText mapIcon ${iconObj.type}`;
	if (iconObj.zIndex) {
		iconEl.style.zIndex = iconObj.zIndex;
	}
	const iconTextEl = document.createElement('div');
	iconTextEl.textContent = iconObj.text;
	iconEl.appendChild(iconTextEl);
	return iconEl;
};

const updateIcons = () => {
	mapIcons.forEach(iconObj => {
		let firstRender = false;
		if (!iconObj.el) {
			firstRender = true;
			iconObj.el = createIconEl(iconObj);
			map.appendChild(iconObj.el);
		}
		const isIconHidden = hiddenIcons[iconObj.type];
		iconObj.el.style.display = isIconHidden ? 'none' : 'block';
		if (!firstRender && iconObj.static) {
			return;
		}

		const imgX = iconObj.x / pixelSize + coordOffset;
		const imgY = height - (iconObj.z / pixelSize + coordOffset);

		iconObj.el.style.left = 100 * imgX / width + '%';
		iconObj.el.style.top = 100 * imgY / height + '%';
	});
};

window.addEventListener('mousemove', e => {
	const canvasOffsetScale = map.offsetWidth / width;
	const x = pixelSize * (-coordOffset + (e.clientX - map.offsetLeft) / canvasOffsetScale);
	const y = pixelSize * (height - coordOffset + (map.offsetTop - e.clientY) / canvasOffsetScale);
	ui.coords.textContent = `${x.toFixed(2)} , ${y.toFixed(2)}`;
});

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
	const idx = mapIcons.indexOf(iconObj);
	if (idx > -1) {
		mapIcons.splice(idx, 1);
		if (iconObj.el) {
			iconObj.el.remove();
		}
	}
};

const removeIconById = (iconId) => {
	const iconToRemove = mapIcons.find(icon => icon.id === iconId);
	if (iconToRemove) {
		removeIcon(iconToRemove);
	}
};

const setIconHidden = (type, isHidden) => {
	hiddenIcons[type] = isHidden;
};

const redrawMap = () => {
	ctx.clearRect(0, 0, width, height);
	ctx.globalCompositeOperation = 'source-over';
	ctx.drawImage(mapImage, 0, 0);
	ctx.globalCompositeOperation = 'multiply';
	ctx.drawImage(fogCanvas, 0, 0);

	updateIcons();
};

const explore = (mapX, mapZ) => {
	const radius = exploreRadius / pixelSize;
	const x = mapX / pixelSize + coordOffset;
	const y = height - (mapZ / pixelSize + coordOffset);
	fogCanvasCtx.beginPath();
	fogCanvasCtx.arc(x, y, radius, 0, 2 * Math.PI, false);
	fogCanvasCtx.fill();
	redrawMap();
};

const setZoom = function(zoomP) {
	const minZoom = 50;
	const maxZoom = 8000 * devicePixelRatio;
	zoomP = Math.min(Math.max(Math.round(zoomP), minZoom), maxZoom);
	currentZoom = zoomP;
	map.style.width = `${zoomP}%`;
	map.style.height = map.offsetWidth + 'px';
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

		map.style.left = zoomRatio * (map.offsetLeft - e.clientX) + e.clientX + 'px';
		map.style.top = zoomRatio * (map.offsetTop - e.clientY) + e.clientY + 'px';

		updateIcons();
	};

	window.addEventListener('wheel', zoomChange);
	window.addEventListener('resize', () => {
		map.style.height = map.offsetWidth + 'px';
	});

	const canvasPreDragPos = {};
	let isZooming = false;
	let lastZoomDist;
	onPointers(window, {
		down: (pointers) => {
			if (pointers.length === 1) {
				canvasPreDragPos.x = map.offsetLeft;
				canvasPreDragPos.y = map.offsetTop;
			} else if (pointers.length === 2) {
				isZooming = true;
				lastZoomDist = undefined;
			}
		},
		move: (pointers) => {
			if (pointers.length === 1 && !isZooming) {
				const e = pointers[0].event;
				map.style.left = canvasPreDragPos.x + (e.clientX - pointers[0].downEvent.clientX) + 'px';
				map.style.top = canvasPreDragPos.y + (e.clientY - pointers[0].downEvent.clientY) + 'px';

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
	removeIconById,
	setIconHidden,
	explore,
	update: redrawMap,
	updateIcons,
	canvas
};

