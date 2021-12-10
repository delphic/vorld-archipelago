const GUI = require('../gui');

module.exports = (function(){
	let exports = {};

	exports.create = (parent, title, paragraphs, confirmText, onConfirm, cancelText, onCancel) => {
		let x = "50%", y = 100, w = 600;
		let dialog = {};

		dialog.element = GUI.appendElement(parent, "div", { "class": "dialog" });
		// TODO: Anchoring enum
		GUI.setStyles(dialog.element, {
			"position": "absolute",
			"left": x,
			"top": y,
			"width": w,
			"margin-left":  "-" + (w/2) + "px"
		});
		if (title) {
			GUI.appendElement(dialog.element, "h1").innerText = title;
		}
		let contentContainer = GUI.appendElement(dialog.element, "div", { "class": "content" });
		for (let i = 0, l = paragraphs.length; i < l; i++) {
			GUI.appendElement(contentContainer, "p").innerText = paragraphs[i];
		}

		let buttons = document.createElement("div");
		if (onConfirm) {
			let text = confirmText;
			if (!text) { text = "Confirm"; }
			let button = GUI.appendElement(buttons, "input", { "type": "button", "class": "confirmButton", "value": text });
			button.onclick = onConfirm;
		}
		if (onCancel) {
			let text = cancelText;
			if (!text) { text = "Cancel"; }
			let button = GUI.appendElement(buttons, "input", { "type": "button", "class": "cancelButton", "value": text });
			button.onclick = onCancel;
		}
		dialog.element.appendChild(buttons);

		dialog.remove = () => { try { parent.removeChild(dialog.element); } catch(e) { console.error(e); } };

		return dialog;
	};

	return exports;
})();