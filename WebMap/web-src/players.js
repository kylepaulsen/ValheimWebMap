import constants from "./constants";
import ui from "./ui";
import websocket from "./websocket";

const width = constants.CANVAS_WIDTH;
const height = constants.CANVAS_HEIGHT;
const pixelSize = constants.PIXEL_SIZE;
const coordOffset = constants.COORD_OFFSET;

// [{id: "2577382164", name: "playerName", x: -429.2752, y: -397.5973}];
let playerData = [];
let canvas;
let removePlayersTimeout;

const createPlayerIcon = (player) => {
	const playerIcon = ui.player.cloneNode(true);
	playerIcon.style.display = 'flex';
	playerIcon.id = player.id;
	playerIcon.dataset.id = undefined;
	playerIcon.querySelector('.playerName').textContent = player.name;
	return playerIcon;
};

const removePlayers = () => {
	document.querySelectorAll('.playerIcon').forEach(icon => {
		if (icon.id !== 'playerTemplate') {
			icon.remove();
		}
	});
	playerData = [];
};

const updatePlayers = () => {
	const canvasOffsetScale = canvas.offsetWidth / width;
	const idMap = {};
	playerData.forEach(player => {
		if (Number.isNaN(player.x)) {
			// dont draw hidden players.
			return;
		}
		idMap[player.id] = true;
		let playerIcon = document.getElementById(player.id);
		if (!playerIcon) {
			playerIcon = createPlayerIcon(player);
			document.body.appendChild(playerIcon);
		}
		const adjustX = (playerIcon.offsetWidth / 2);
		const adjustY = (playerIcon.offsetHeight / 2);
		const imgX = player.x / pixelSize + coordOffset;
		const imgY = height - (player.y / pixelSize + coordOffset);

		playerIcon.style.left = (imgX * canvasOffsetScale + canvas.offsetLeft) - adjustX + 'px';
		playerIcon.style.top = (imgY * canvasOffsetScale + canvas.offsetTop) - adjustY + 'px';
	});
	document.querySelectorAll('.playerIcon').forEach(icon => {
		if (!idMap[icon.id] && icon.id !== 'playerTemplate') {
			// clean up hidden or disconnected players.
			icon.remove();
		}
	});
	clearTimeout(removePlayersTimeout);
	removePlayersTimeout = setTimeout(removePlayers, 5000);
};

const init = (options) => {
	canvas = options.canvas;
	websocket.addActionListener('players', (players) => {
		playerData = players;
		updatePlayers();
	});
};

export default {
	init,
	get players() {
		return playerData;
	},
	redrawPlayers: updatePlayers
};
