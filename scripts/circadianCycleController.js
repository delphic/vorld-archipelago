// Day / night cycle controller
let Fury = require('../fury/src/fury');
let Maths = require('../fury/src/maths');

module.exports = (function(){
	let exports = {};

	// Maybe we should have a gradient module
	let getGradientValues = (out, gradient, value) => {
		// There's probably a more elegant way to do this 
		let from, to;
		let fromTime, toTime;
		let index = 0;
		while (index < gradient.length) {
			if (gradient[index].time > value) {
				to = gradient[index].value;
				toTime = gradient[index].time;
				if (index  > 0) {
					fromTime = gradient[index - 1].time;
					from = gradient[index - 1].value;
				} else {
					// Wrap around!
					fromTime = gradient[gradient.length - 1].time - 1;
					from = gradient[gradient.length - 1].value;
				}
				break;
			}
			index++;
		}
		if (from == undefined) {
			fromTime = gradient[gradient.length - 1].time;
			from = gradient[gradient.length - 1].value;
			toTime = gradient[gradient.length - 1].time + 1;
			to = gradient[gradient.length - 1].value;
		}

		let lerp = (value - fromTime) / (toTime - fromTime);
		out[0] = from;
		out[1] = to;
		out[2] = lerp;
	};

	let gradientValues = [];
	let evaluateFloatGradient = (gradient, value) => {
		getGradientValues(gradientValues, gradient, value);
		return Maths.lerp(gradientValues[0], gradientValues[1], gradientValues[2]);
	};

	let evaluteColorGradient = (out, gradient, value) => {
		getGradientValues(gradientValues, gradient, value);
		Maths.vec3.lerp(out, gradientValues[0], gradientValues[1], gradientValues[2]);
		// TODO: Probably want to do something other than lerping rgb as it leads to greys
		// ^^ Yes hsv or hsl please
	};

	let nightFog = Maths.vec3.fromValues(0, 0, 0.02);
	let transitionFog = Maths.vec3.fromValues(110/255, 141/255, 147/255);
	let dayFog = Maths.vec3.fromValues(136/255, 206/255, 235/255);
	let nightFogDensity = 0.02;
	let twilightFogDensity = 0.01;
	let noonFogDensity = 0.005;

	// Test values!
	// Fog changes preceed dawn light and lag dusk
	// Alternatively we could just calculate light level via incidence, rather than using this manual gradient style
	exports.lightCycle = [ 
		{ time: 0.15, value: 0 }, 
		{ time: 0.25, value: 0.4 },
		{ time: 0.325, value: 0.8 },
		{ time: 0.5, value: 0.9 },
		{ time: 0.625, value: 0.8 },
		{ time: 0.75, value: 0.4 },
		{ time: 0.85, value: 0 } ];
	exports.fogColorCycle = [ 
		{ time: 0.149, value: nightFog },
		{ time: 0.24, value: transitionFog },
		{ time: 0.5, value: dayFog },
		{ time: 0.79, value: transitionFog },
		{ time: 0.851 , value: nightFog }
	];
	exports.fogDensityCycle = [
		{ time: 0.159, value: nightFogDensity },
		{ time: 0.24, value: twilightFogDensity },
		{ time: 0.5, value: noonFogDensity },
		{ time: 0.79, value: twilightFogDensity },
		{ time: 0.851, value: nightFogDensity }
	];
	// This is something would be nice to have inspectors for to play with and then serialize...

	// Ambient Light and fake HDR thoughts
	// The lack of independent control of ambient light based current sunlight color is sad... would be easy enough to do but it would effect underground
	// Well could we alter it depending if you were in sunlight? It might look wierd at the mouth of caves though, everything would get brighter as you exited
	// rather than darker as HDR would imply... well we know what blocks are in sunlight, and the currently sunlight level, we could adjust based on a combination of if
	// you're in sunlight and if they're in sunlight - for dynamic objects we'd need to bind a material uniform to 'sunlight' level rather than reading from vertex, but that's
	// perfectly managable.

	// This is duping the settings in vorldHelper lightingConfigs
	// Arguably fog level is weather not day/night, although we're increasing it at night for effect 

	exports.create = (config) => { /* materials, startTime, timePeriod, updatePeriod, sunlightLevels, fogColors */
		let ccc = {};
		
		let voxelMaterials = config.materials;

		let timePeriod = config.timePeriod || 24 * 60;
		let time = config.startTime || 0;
		time *= timePeriod; // startTime expected to be normalised time

		let updatePeriod = config.updatePeriod;
		let timeToNextUpdate = updatePeriod || 0;

		// gradient objects which are an ordered array of time -> value key value pairs
		// Maybe this should be a configurable set of gradients, with material property names and types as well as gradient values
		let sunlightLevels = config.sunlightLevels;
		let fogColors = config.fogColors; 
		let fogDensities = config.fogDensities;

		let fogColor = Maths.vec3.create();

		let updateMaterialValues = (normalizedDayTime) => {
			let sunlightLevel = evaluateFloatGradient(sunlightLevels, normalizedDayTime);
			let fogDensity = evaluateFloatGradient(fogDensities, normalizedDayTime);
			evaluteColorGradient(fogColor, fogColors, normalizedDayTime);

			for (let i = 0, l = voxelMaterials.length; i < l; i++) {
				Maths.vec3.copy(voxelMaterials[i].fogColor, fogColor);
				voxelMaterials[i].directionalMagnitude = sunlightLevel;
				voxelMaterials[i].fogDensity = fogDensity;
				voxelMaterials[i].dirty = true; // Just in case this is the only material being rendered 
			}

			Fury.Renderer.clearColor(fogColor[0], fogColor[1], fogColor[2], 1.0);

			// Set background colour to fog color so CSS effects like blur look good
			let cssColor = "rgb(" + Math.round(fogColor[0] * 255) + ", " + Math.round(fogColor[1] * 255) + ", " + Math.round(fogColor[2] * 255) + ")";
			document.body.style.backgroundColor = cssColor;
		};

		ccc.update = (elapsed) => {
			time = (time + elapsed) % timePeriod;
			if (updatePeriod !== undefined) {
				timeToNextUpdate -= elapsed;
			}
			if (timeToNextUpdate <= 0) {
				updateMaterialValues(time / timePeriod);
				if (updatePeriod !== undefined) {
					timeToNextUpdate += updatePeriod;
				}
			}
		};

		updateMaterialValues(time / timePeriod);

		return ccc;
	};

	return exports;
})();