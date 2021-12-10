let GUI = require('../gui');

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

module.exports = (function() {
	let exports = {};

	let createControl = (form, label, attributes) => {
		let control = GUI.appendElement(form, "div", { "class": "control" });
		GUI.appendElement(control, "label", { "for": attributes["id"] }).innerText = label;
		return GUI.appendElement(control, "input", attributes);
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
		let container = GUI.appendElement(form, "div", { "class": "control" });
		let input = GUI.appendElement(container, "input", {
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
			createButtonControl(form, "↶", () => {
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
				createButtonControl(form, keys[i], () => {
					form.targetStack.push(obj);
					clearElementChildren(form);
					populateInspector(form, obj[keys[i]]);
				});
				// TODO: Check .constructor.name and .length to determine if vec3 etc (Float32Array) 
				// Will have to make some assumptions
			}
		}
	};

	exports.create = (parent, title, obj, x, y, w, h) => {
		let box = GUI.createBox(parent, x, y, w, h, title);
		box.classList.add("inspector");

		let form = document.createElement("div");
		form.targetStack = [];
		populateInspector(form, obj);
		box.appendChild(form);

		return form;
	};

	return exports;
})();