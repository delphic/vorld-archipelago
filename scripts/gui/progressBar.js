let GUI = require('../gui')

let ProgressBar = module.exports = (function(){
	let exports = {};

	exports.create = (parent) => {
		let outer = GUI.appendElement(parent, "div", { "class": "progressBarBorder" });
		let inner = GUI.appendElement(outer, "div", { "class": "progressBar" });
		return {
			element: outer,
			bar: inner,
			setProgress: (value) => { inner.style.width = (100 * value) + "%" }
		};
	};

	return exports;
})();