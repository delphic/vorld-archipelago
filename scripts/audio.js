let Maths = require('../fury/src/maths');

let Audio = module.exports = (function(){ // TODO: Different name
	let exports = {};

	// Web Audio! 
	// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
	// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API
	// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
	let audioContext = null;
	let masterGainNode, bgmGainNode, sfxGainNode;
	let buffers = {};

	audioContext = 	new (window.AudioContext || window.webkitAudioContext)();
	masterGainNode = audioContext.createGain();
	masterGainNode.connect(audioContext.destination);
	bgmGainNode = audioContext.createGain();
	bgmGainNode.connect(masterGainNode);
	sfxGainNode = audioContext.createGain();
	sfxGainNode.connect(masterGainNode);

	bgmGainNode.gain.value = 0.25; // Default BGM to quiet!

	exports.masterGainNode = masterGainNode;
	exports.bgmGainNode = bgmGainNode;
	exports.sfxGainNode = sfxGainNode;

	// Chrome does not obey the standard specification because they don't
	// want to add more UI to their browser and would rather break all 
	// games and experiments that use WebAudio - fuck you google.
	// Auto-resume on userinteraction
	(function() {
		const eventNames = [ 'click', 'contextmenu', 'auxclick', 'dblclick', 'mousedown', 'mouseup', 'pointerup', 'touchend', 'keydown', 'keyup' ];
		// BUG: This is triggered by F5 to refresh the page but chrome does not think this is a valid check
		let resumeAudioContext = function(event) {
			if (audioContext.state == "suspended") {
				audioContext.resume();
			} 
			if (audioContext.state != "suspended") {
				console.log("Resumed audio context");
				for(let i = 0; i < eventNames.length; i++) {
					document.removeEventListener(eventNames[i], resumeAudioContext);
				}
			}
		};
		
		for(let i = 0; i < eventNames.length; i++) {
			document.addEventListener(eventNames[i], resumeAudioContext);
		}
	})();


	exports.fetchAudio = (uris, callback) => {
		if (!uris || !uris.length) {
			callback();
			return;
		}

		let assetLoadingCount = 0;
		let loadingCompleteCallback = () => {
			assetLoadingCount--;
			if (assetLoadingCount <= 0) {
				callback();
			}
		};

		let fetchBuffer = (uri) => {
			assetLoadingCount++;
			fetch(uri).then((response) => {
				if (response.ok) {
					return response.arrayBuffer()
				} else {
					loadingCompleteCallback();
					throw new Error("Unable to fetch " + uri + ", response status = " + response.status);
				}
			}).then((buffer) => {
				if (buffer) {
					audioContext.decodeAudioData(buffer, (decodedData) => {
						buffers[uri] = decodedData;
						loadingCompleteCallback();
					});
				} else {
					console.error("Unable to fetch " + uri + " empty buffer");
					loadingCompleteCallback();
				}
			});
		};

		for (let i = 0, l = uris.length; i < l; i++) {
			fetchBuffer(uris[i]);
		}
	};

	let setNodePosition = (node, position) => {
		if (node.positionX) {
			node.positionX.value = position[0];
			node.positionY.vlaue = position[1];
			node.positionZ.value = position[2];
		} else {
			node.setPosition(position[0], position[1], position[2]);
		}
	};

	let setNodeOrientation = (node, forward) => {
		if (node.orientationX) {
			node.orientationX.value = forward[0];
			node.orientationY.value = forward[1]; 
			node.orientationZ.value = forward[2]; 
		} else {
			node.setOrientation(forward[0], forward[1], forward[2]);
		}
	};

	exports.setListenerPosition = (position) => {
		// Note Audio Listener is not a node, but the methods are the same
		setNodePosition(audioContext.listener, position);
	};

	exports.setListenerOrientation = (forward, up) => {
		let listener = audioContext.listener;
		if (listener.forwardX) {
			listener.forwardX.value = forward[0];
			listener.forwardY.value = forward[1];
			listener.forwardZ.value = forward[2];
			listener.upX.value = up[0];
			listener.upY.value = up[1];
			listener.upZ.value = up[2];
		} else {
			listener.setOrientation(forward[0], forward[1], forward[2], up[0], up[1], up[2]);
		}
	};

	let createPannerNode = (position, forward, targetNode) => {
		// https://developer.mozilla.org/en-US/docs/Web/API/PannerNode
		let panner = audioContext.createPanner();

		// 'equalpower' / 'HRTF' (default: 'equalpower')
		panner.panningModel = 'HRTF';
		/* 	linear: A linear distance model calculating the gain induced by the distance according to:
			1 - rolloffFactor * (distance - refDistance) / (maxDistance - refDistance)
			
			inverse (default): An inverse distance model calculating the gain induced by the distance according to:
			refDistance / (refDistance + rolloffFactor * (Math.max(distance, refDistance) - refDistance))
		
			exponential: An exponential distance model calculating the gain induced by the distance according to:
			pow((Math.max(distance, refDistance) / refDistance, -rolloffFactor).*/
		panner.distanceModel = 'exponential';
		// Distance at which volume reduction starts, also effects rate of decay (default: 1)
		panner.refDistance = 1;
		// Distance at volume reduction finishes (default: 10000)
		panner.maxDistance = 10000;
		// Used in distance model to determine rate of decay with distance (default: 1)
		panner.rolloffFactor = 1; // TODO: Determine sane value for this

		// Inside inner angle, there is no volume reduction, outside outer angle sound is reduced by outergain
		panner.coneInnerAngle = 360;
		panner.coneOuterAngle = 0;
		panner.coneOuterGain = 0;

		if (forward) {
			setNodeOrientation(panner, forward);
		} else {
			setNodeOrientation(panner, Maths.vec3Z);
		}
		setNodePosition(panner, position);

		panner.connect(targetNode);
		return panner;
	};

	let playBuffer = (buffer, targetNode, delay) => {
		let source = audioContext.createBufferSource();
		source.buffer = buffer;
		source.connect(targetNode);
		source.start(delay);
		return source;
	};

	exports.playSfxAtPosition = (uri, delay, position, loop) => {
		if (buffers[uri]) {
			if (!delay) delay = 0;
			let panner = createPannerNode(position, null, sfxGainNode);
			let source = playBuffer(buffers[uri], panner, delay);
			source.panner = panner;
			source.loop = !!loop;
			return source;
		}
	};

	// TODO: May want to take a sound definition / instance instead
	// of uri which can contain optional position information, and 
	// target mixer that way could categorise sounds outside of the 
	// audio module - although might still want broad predefined categories
	exports.updateSfxPosition = (source, position) => {
		if (source.panner) {
			setNodePosition(source.panner, position);
		} else {
			console.warn("Unable to update position of audio source with no panner node, use playSfxAtPosition to create the audio source");
		}
	};

	// Question should in world sound and UI have different gain nodes?
	exports.playSfx = (uri, delay) => {
		if (buffers[uri]) {
			if (!delay) delay = 0;
			return playBuffer(buffers[uri], sfxGainNode, delay);
		}
		return null;
	};

	exports.playBgm = (uri, loop, delay) => {
		if (buffers[uri]) {
			if (!delay) delay = 0;
			let source = playBuffer(buffers[uri], bgmGainNode, delay);
			source.loop = !!loop;
			return source;
		}
	};

	return exports;
})();