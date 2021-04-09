{
	const ui = {};
	const allUi = document.querySelectorAll('[data-id]');
	allUi.forEach(el => {
		ui[el.dataset.id] = el;
	});

	const { canvas } = ui;
	const width = 2048;
	const height = 2048;
	const pixelSize = 12;
	const coordOffset = width / 2;

	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');

	// canvas.style.width = window.innerWidth + 'px';
	canvas.style.width = "100%";
	canvas.style.left = (window.innerWidth - canvas.offsetWidth) / 2 + 'px';
	canvas.style.top = (window.innerHeight - canvas.offsetHeight) / 2 + 'px';

	let currentZoom = 100;

	const mapImage = document.createElement('img');
	const fogImage = document.createElement('img');
	const fogCanvas = document.createElement('canvas');
	fogCanvas.width = width;
	fogCanvas.height = height;
	const fogCanvasCtx = fogCanvas.getContext('2d');
	fogCanvasCtx.fillStyle = '#ffffff';
	let playerData = []; // [{id: "2577382164", name: "Cinnamon", x: -429.2752, y: -397.5973}];
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

	const updateFog = () => {
		playerData.forEach(player => {
			const x = player.x / pixelSize + coordOffset;
			const y = height - (player.y / pixelSize + coordOffset);
			fogCanvasCtx.beginPath();
			fogCanvasCtx.arc(x, y, 20, 0, 2 * Math.PI, false);
			fogCanvasCtx.fill();
		});
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
			// console.log("!!!" + ui.playerIcon.height, playerIcon.offsetWidth);
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

	const redrawMap = () => {
		ctx.clearRect(0, 0, width, height);
		ctx.globalCompositeOperation = 'source-over';
		ctx.drawImage(mapImage, 0, 0);
		ctx.globalCompositeOperation = 'multiply';
		updateFog();
		ctx.drawImage(fogCanvas, 0, 0);
		updatePlayers();
	};

	// ui.playerIcon.onload = updatePlayers;

	fogImage.src = 'fog';
	let fogLoaded = false;
	fogImage.onload = () => {
		fogCanvasCtx.drawImage(fogImage, 0, 0);
		fogLoaded = true;
	};

	fetch('/map').then(res => res.blob()).then(data => {
		// Doing things this way to make the full map harder to accidentally see.
		const firstDraw = () => {
			if (fogLoaded) {
				redrawMap();
				setTimeout(updatePlayers, 100);
			} else {
				setTimeout(firstDraw, 0);
			}
		};
		mapImage.onload = firstDraw;
		mapImage.src = URL.createObjectURL(data);
	}).catch(e => {
		console.log('Failed to get map!', e);
	});

	const setZoom = function(zoomP) {
		zoomP = Math.min(Math.max(Math.floor(zoomP), 50), 2000);
		currentZoom = zoomP;
		canvas.style.width = `${zoomP}%`;
	};

	window.addEventListener('wheel', (e) => {
		const oldZoom = currentZoom;

		const zoomAmount = Math.max(Math.floor(oldZoom / 5), 1);
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
		updatePlayers();
	});

	const canvasPreDragPos = {};
	const mouseDownPoint = {};
	let mouseDown = false;
	window.addEventListener('mousedown', (e) => {
		mouseDown = true;
		mouseDownPoint.x = e.clientX;
		mouseDownPoint.y = e.clientY;
		canvasPreDragPos.x = canvas.offsetLeft;
		canvasPreDragPos.y = canvas.offsetTop;
	});

	window.addEventListener('mouseup', () => {
		mouseDown = false;
	});

	window.addEventListener('mousemove', (e) => {
		if (mouseDown) {
			canvas.style.left = canvasPreDragPos.x + (e.clientX - mouseDownPoint.x) + 'px';
			canvas.style.top = canvasPreDragPos.y + (e.clientY - mouseDownPoint.y) + 'px';
			updatePlayers();
		}
	});

	const actions = {
		players: (lines) => {
			playerData = [];
			let newPlayer = {};
			lines.forEach((line, idx) => {
				const dataIdx = idx % 4;
				switch (dataIdx) {
					case 0:
						newPlayer.id = line;
						break;
					case 1:
						newPlayer.name = line;
						break;
					case 2:
						newPlayer.x = parseFloat(line);
						break;
					case 3:
						newPlayer.y = parseFloat(line);
						playerData.push(newPlayer);
						newPlayer = {};
						break;
				}
			});
			// console.log(JSON.stringify(playerData));
			redrawMap();
		}
		// fogUpdate: () => {
		// 	// reload fog image
		// 	console.log('update fog!');
		// 	const newImage = document.createElement('img');
		// 	newImage.src = 'fog';
		// 	newImage.onload = () => {
		// 		fogImage = newImage;
		// 	};
		// }
	};

	const ws = new WebSocket(`ws://${location.host}`);
	ws.addEventListener('message', (e) => {
		const lines = e.data.trim().split('\n');
		const action = lines.shift();
		const actionFunc = actions[action];
		if (actionFunc) {
			actionFunc(lines);
		} else {
			console.log("unknown websocket message: ", e.data);
		}
	});

	setInterval(() => {
		console.log(playerData);
	}, 10000);
}

