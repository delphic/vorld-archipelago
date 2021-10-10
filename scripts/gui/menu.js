let GUI = require('../gui');

let Menu = module.exports = (function(){
	let exports = {};

	exports.create = (parent, title, options) => {
		let menuElement = GUI.appendElement(parent, "div", { "class" : "menu" });
		menuElement.title = GUI.appendElement(menuElement, "h1").innerText = title;
		
		menuElement.buttons = [];
		for (let i = 0, l = options.length; i < l; i++) {
			let button = GUI.appendElement(menuElement, "input", { "type": "button", "value": options[i].text });
			button.onclick = options[i].callback;
			menuElement.buttons.push(button);
		}
		return {
			element: menuElement,
			remove: () => { parent.removeChild(menuElement); }
		};
	};

	return exports;
})();