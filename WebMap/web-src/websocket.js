const actionListeners = {};

const addActionListener = (type, func) => {
	const listeners = actionListeners[type] || [];
	listeners.push(func);
	actionListeners[type] = listeners;
};

const actions = {
	players: (lines) => {
		const playerData = [];
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
		actionListeners.players.forEach(func => {
			func(playerData);
		});
	}
};

const init = () => {
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
};

export default {
	init,
	addActionListener
};

