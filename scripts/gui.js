// DHTML UI System
// In the same vein as Fury this is aiming to be a set of helper functions for working 
// with DHTML, it is not supposed to provide unnecessary abstractions.
// However a potentially necessary abstraction for game dev is positioning 

// Unlike Fury it does not - currently - try to minimise garbage allocation
// As changes are event driven, ease of use is preferred hence configuration objects

// HTML is set up to assume scrolling pages, games have static screens and anchoring
module.exports = (function(){
	let exports = {};

	// For now just a global root div you can create subcanvas beneath that.
	let root = null;
	exports.root = null;

	/**
	 * Append a div to the parent element
	 * @param {HTMLElement} parent 
	 * @param {string} tag
	 * @param {object} [attributes]
	 */
	let appendElement = exports.appendElement = (parent, tag, attributes) => {
		let element = document.createElement(tag);
		if (attributes) {
			let names = Object.keys(attributes);
			for (let i = 0, l = names.length; i < l; i++) {
				element.setAttribute(names[i], attributes[names[i]]);
			}
		}
		parent.appendChild(element);
		return element;
	};

	let shouldSuffixPx = (name, value) => {
		return (typeof value == "number") && 
			// This there a more sane way to determine this than hard coding it?
			(name == "left" || name == "right" || name == "top" || name == "bottom" || name == "width" || name == "height");
	};

	let setStyles = exports.setStyles = (element, styleAttributes) => {
		let names = Object.keys(styleAttributes);
		for (let i = 0, l = names.length; i < l; i++) {
			let name = names[i];
			let value = styleAttributes[name];
			if (shouldSuffixPx(name, value)) {
				value = value + "px";
			}
			element.style[names[i]] = value;
		}
		return element;
	};

	exports.createBox = (parent, x, y, w, h, title, content) => {
		let box = appendElement(parent, "div", { "class": "box" });
		// TODO: Anchoring enum
		setStyles(box, {
			"position": "absolute",
			"left": x,
			"top": y,
			"width": w,
			"height": h
		});
		if (title) {
			appendElement(box, "h1").innerText = title;
		}
		let contentContainer = appendElement(box, "div", { "class": "content" });
		if (content) {
			appendElement(contentContainer, "p").innerText = content;
		}
		return box;
	};

	exports.init = (furyCanvas) => {
		root = appendElement(furyCanvas.parentElement, "div", { "class": "furyGUI" });
		exports.root = root;
	};

	return exports;
})();