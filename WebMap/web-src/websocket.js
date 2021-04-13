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
					if (line !== 'hidden') {
						const xyz = line.split(',').map(parseFloat);
						newPlayer.x = xyz[0];
						newPlayer.y = xyz[1];
						newPlayer.z = xyz[2];
					}
					playerData.push(newPlayer);
					newPlayer = {};
					break;
			}
		});
		actionListeners.players.forEach(func => {
			func(playerData);
		});
	},
	ping: (lines) => {
		const xz = lines[2].split(',');
		const ping = {
			playerId: lines[0],
			name: lines[1],
			x: parseFloat(xz[0]),
			z: parseFloat(xz[1])
		};
		actionListeners.ping.forEach(func => {
			func(ping);
		});
	},
	pin: (lines) => {
		const xz = lines[4].split(',').map(parseFloat);
		const pin = {
			id: lines[1],
			uid: lines[0],
			type: lines[2],
			name: lines[3],
			x: xz[0],
			z: xz[1],
			text: lines[5]
		};
		actionListeners.pin.forEach(func => {
			func(pin);
		});
	},
	rmpin: (lines) => {
		actionListeners.rmpin.forEach(func => {
			func(lines[0]);
		});
	}
};

Object.keys(actions).forEach(key => {
	actionListeners[key] = [];
});

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

