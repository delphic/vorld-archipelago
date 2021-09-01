// DHTML UI System
// In the same vein as Fury this is aiming to be a set of helper functions for working 
// with DHTML, it is not supposed to provide unnecessary abstractions.
// However a potentially necessary abstraction for game dev is positioning 

// Unlike Fury it does not - currently - try to minimise garbage allocation
// As changes are event driven, ease of use is preferred hence configuration objects

const { vec3 } = require('../fury/src/maths');

// HTML is set up to assume scrolling pages, games have static screens and anchoring
let GUI = module.exports = (function(){
	let exports = {};

	// For now just a global root div you can create subcanvas beneath that.
	let root = null;

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
	};

	let createBox = (parent, x, y, w, h, title, content) => {
		let box = appendElement(parent, "div", { "class": "box" });
		// TODO: Anchoring enum
		setStyles(box, {
			"position": "absolute",
			"right": x,
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

	let Inspector = exports.Inspector = (function() {
		let exports = {};

		let createControl = (form, label, attributes) => {
			let control = appendElement(form, "div", { "class": "control" });
			appendElement(control, "label", { "for": attributes["id"] }).innerText = label;
			return appendElement(control, "input", attributes);
		};
	
		let createBooleanControl = (form, id, obj, key) => {
			let input = createControl(form, key, {
				"id": id,
				"type": "checkbox",
				"data-key": key
			});
			if (obj[key]){
				// checked doesn't work like other attributes
				input.checked = true;
			}
			input.targetObj = obj;
			input.addEventListener('change', onBooleanControlChange);
		};
	
		let onBooleanControlChange = (e) => {
			let value = e.target.checked;
			let dataKey = e.target.getAttribute("data-key");
			let obj = e.target.targetObj;
			obj[dataKey] = value;
		};
	
		let createNumberControl = (form, id, obj, key) => {
			let input = createControl(form, key, {
				"id": id,
				"type": "number",
				"value": obj[key],
				"data-key": key
			});
			input.targetObj = obj;
			input.addEventListener('change', onNumberControlChange);
		};
	
		let onNumberControlChange = (e) => {
			let numberValue = Number.parseFloat(e.target.value);
			let dataKey = e.target.getAttribute("data-key");
			let obj = e.target.targetObj;
			if (typeof numberValue == "number" && !isNaN(numberValue)) {
				obj[dataKey] = numberValue;
			}
			e.target.value = e.target.targetObj[dataKey];
		};
	
		let createStringControl = (form, id, obj, key) => {
			let input = createControl(form, key, {
				"id": id,
				"value": obj[key],
				"data-key": key
			});
			input.targetObj = obj;
			input.addEventListener('change', onStringControlChange);
		};
	
		let onStringControlChange = (e) => {
			let dataKey = e.target.getAttribute("data-key");
			let obj = e.target.targetObj;
			obj[dataKey] = e.target.value;
		};
	
		let createButtonControl = (form, text, callback) => {
			let container = appendElement(form, "div", { "class": "control" });
			let input = appendElement(container, "input", {
				"type": "button",
				"value": text
			});
			input.addEventListener('click', callback);
		};
	
		let clearElementChildren = (element) => {
			while (element.firstChild) {
				element.removeChild(element.firstChild);
			}
		};

		let populateInspector = (form, obj) => {
			if (form.targetStack.length > 0) {
				createButtonControl(form, "↶", (e) => {
					let target = form.targetStack.pop();
					clearElementChildren(form);
					populateInspector(form, target); 
				});
			}
			
			// TODO: If is Array have add and remove buttons
			// Issue is what type of control to add... well we could just let the user the choice?
			// probably should try to determine if there was a single type though
	
			let keys = Object.keys(obj);
			for (let i = 0; i < keys.length; i++) {
				let value = obj[keys[i]];
				let id = keys[i]; // This ID isn't good enough having multiple displays on same kinda of objects - need a prefax or mapping
	
				// JS Type reference:
				// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof
				if (typeof value == "boolean") {
					createBooleanControl(form, id, obj, keys[i]);
				}
				if (typeof value == "number") {
					createNumberControl(form, id, obj, keys[i]);
				}
				if (typeof value == "string") {
					createStringControl(form, id, obj, keys[i]);
				}
				if (typeof value == "object") {
					createButtonControl(form, keys[i], (e) => {
						form.targetStack.push(obj);
						clearElementChildren(form);
						populateInspector(form, obj[keys[i]]);
					});
					// TODO: Check .constructor.name and .length to determine if vec3 etc (Float32Array) 
					// Will have to make some assumptions
				}
			}
		};

		exports.create = (title, obj, x, y, w, h) => {
			let box = createBox(root, x, y, w, h, title);
			box.classList.add("inspector");

			let form = document.createElement("div");
			form.targetStack = [];
			populateInspector(form, obj);
			box.appendChild(form);

			return form;
		};

		return exports;
	})();

	exports.init = (furyCanvas) => {
		root = appendElement(furyCanvas.parentElement, "div", { "class": "furyGUI" });

		// Inspector Test code
		/*
		let Maths = require('../fury/src/maths');
		let testObj = {
			"foo": 5,
			"bar": "a string",
			"array": [],
			"obj": { "nested number": 3, "str": "fox", "cat": { "exists": true } },
			"func": () => { return true; },
			"vec3": Maths.vec3.create()
		};
		Inspector.create("Inspector", testObj, 20, 20, 200, "auto");
		*/
	};

	return exports;
})();