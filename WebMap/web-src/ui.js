const ui = {};
const allUi = document.querySelectorAll('[data-id]');
allUi.forEach(el => {
	ui[el.dataset.id] = el;
});

export default ui;
