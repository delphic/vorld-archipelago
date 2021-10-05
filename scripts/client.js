let Fury = require('../fury/src/fury');
const { vec3, quat } = require('../fury/src/maths');
let VoxelShader = require('../vorld/core/shader');
let VorldHelper = require('./vorldHelper');
let Player = require('./player');
let GUI = require('./gui');
let Audio = require('./audio');
let Primitives = require('./primitives');

let scene, overlayScene, camera, cameraRatio = 16 / 9;
let world = { boxes: [] }, vorld = null;
let material, alphaMaterial;
let player, spawnPlayer = true;
let skyColor = vec3.fromValues(136/255, 206/255, 235/255);
let waterColor = vec3.fromValues(0, 113/255, 144/255);

let initialBounds = {	// Testing bounds
	iMin: -6, iMax: 6,
	jMin: -1, jMax: 3,
	kMin: -6, kMax: 6
};

// Bigger bounds!
/* initialBounds = {
	iMin: -20, iMax: 20,
	jMin: -1, jMax: 3,
	kMin: -20, kMax: 20
}; */
// TODO: GUI option for quick test vs game 
// TODO: Calculate point at which fog becomes ~1.0, set max draw distance to this and generation target distance to this

let playerMovementConfig = {
	mouseLookSpeed: 0.25,	// TODO: This should be in player facing settings object
	acceleration: 80,
	maxWalkSpeed: 2,
	maxWadeSpeed: 2,
	maxRunSpeed: 5.5,
	maxSprintSpeed: 8,
	stopSpeed: 1.5,
	airAcceleration: 10,
	airMaxMovementSpeed: 4,
	waterAcceleration: 10,
	waterMaxMovementSpeed: 3
};

// TODO: Extract to Fury Utils
let freeLookCameraUpdate = (function(){
	// TODO: Extract into free look camera
	let rotateRate = 0.1 * Math.PI;
	let zoomRate = 16;

	let Input = Fury.Input;
	let localx = vec3.create();
	let localy = vec3.create();
	let localz = vec3.create();
	
	// https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles
	let getRoll = function(q) {
		// Note: glMatrix is x,y,z,w where as wiki assumes w,x,y,z!
		let sinr_cosp = 2 * (q[3] * q[0] + q[1] * q[2]);
		let cosr_cosp = 1 - 2 * (q[0] * q[0] + q[1] * q[1]);
		return Math.atan(sinr_cosp / cosr_cosp);
		// If you want to know sector you need atan2(sinr_cosp, cosr_cosp)
		// but we don't in this case.
	};

	return (elapsed) => {
		let q = camera.rotation;
		let p = camera.position;
		Fury.Maths.quatLocalAxes(q, localx, localy, localz);
		
		if (Input.mouseDown(2)) {
			let xRotation = Input.MouseDelta[0] * rotateRate*elapsed;
			let yRotation = Input.MouseDelta[1] * rotateRate*elapsed;
			Fury.Maths.quatRotate(q, q, -xRotation, Fury.Maths.vec3Y);
	
			let roll = getRoll(q);
			let clampAngle = 10 * Math.PI/180;
			if (Math.sign(roll) == Math.sign(yRotation) || Math.abs(roll - yRotation) < 0.5*Math.PI - clampAngle) {
				quat.rotateX(q, q, -yRotation);
			}
		}
	
		if(Input.keyDown("w")) {
			vec3.scaleAndAdd(p, p, localz, -zoomRate*elapsed);
		}
		if(Input.keyDown("s")) {
			vec3.scaleAndAdd(p, p, localz, zoomRate*elapsed);
		}
		if(Input.keyDown("a")) {
			vec3.scaleAndAdd(p, p, localx, -zoomRate*elapsed);
		}
		if(Input.keyDown("d")) {
			vec3.scaleAndAdd(p, p, localx, zoomRate*elapsed);
		}
		if (Input.keyDown("q")) {
			vec3.scaleAndAdd(p, p, localy, -zoomRate*elapsed);
		}
		if (Input.keyDown("e")) {
			vec3.scaleAndAdd(p, p, localy, zoomRate*elapsed);
		}
	};
})();

let start = () => {
	// Create camera and scene
	camera = Fury.Camera.create({
		near: 0.1,
		far: 1000000.0,
		fov: 1.0472,
		ratio: cameraRatio,
		position: vec3.fromValues(53.0, 55.0, 123.0),
		rotation: quat.fromValues(-0.232, 0.24, 0.06, 0.94)
	});
	scene = Fury.Scene.create({ camera: camera, enableFrustumCulling: true });
	overlayScene = Fury.Scene.create({ camera: camera });
	Fury.Renderer.clearColor(skyColor[0], skyColor[1], skyColor[2], 1.0);
	
	Fury.GameLoop.init({ loop: loop, maxFrameTimeMs: 66 });
	Fury.GameLoop.start();
	vorld = VorldHelper.init({ scene: scene, material: material, alphaMaterial: alphaMaterial, bounds: initialBounds }, (data) => {
		// Spawn Player
		if (spawnPlayer) {
			player = Player.create({
				world: world,
				vorld: vorld,
				position: vec3.fromValues(12, 32, 12),
				quad: overlayScene.add({ mesh: Primitives.createQuadMesh(0), material: alphaMaterial, position: vec3.create() }),
				camera: camera,
				config: playerMovementConfig,
				// Normal sized player
				size: vec3.fromValues(1,2,1),
				stepHeight: 0.51
				// Massive Player!
				//size: vec3.fromValues(4,8,4),
				//stepHeight: 2.01
				// Tiny Player
				//size: vec3.fromValues(0.25,0.5,0.25),
				//stepHeight: 0.25
			});
		}
	});
};

let time = 0;
let isInWater = false;
let loop = (elapsed) => {
	time += elapsed;
	if (player) {
		// Unlocking the pointer is pausing the game
		if (!Fury.Input.isPointerLocked() && Fury.Input.mouseDown(0, true)) {
			Fury.Input.requestPointerLock();
		}	
		// Only update player / world if have locked pointer i.e. have focused the element focus
		// TODO: This isn't enough you can change focus with tab
		if (Fury.Input.isPointerLocked()) {
			player.update(elapsed);
			Audio.setListenerPosition(player.position);
			// TODO: Orientation
		}

		// Note after having the same tab open for a long time with multiple refreshes:
		// a short time after refresh and generation long system tasks would block the main thread  
		// for over a second however closing that tab and openning a new one made it disappear
	} else {
		freeLookCameraUpdate(elapsed);
	}

	camera.clear = true;
	scene.render();
	camera.clear = false;
	overlayScene.render();
};

window.addEventListener('load', (event) => {
	let glCanvasId = 'fury';
	
	// Full screen logic
	// TODO: Move to Fury.Utils
	let resolutionFactor = 1.0;
	let glCanvas = document.getElementById(glCanvasId);
	glCanvas.style = "width: 100%; height: 100vh";
	document.body.style = "margin: 0; overflow-y: hidden;";
	let updateCanvasSize = (event) => {
		glCanvas.width = resolutionFactor * glCanvas.clientWidth;
		glCanvas.height = resolutionFactor * glCanvas.clientHeight;
		cameraRatio = glCanvas.clientWidth  / glCanvas.clientHeight;
		if (camera && camera.ratio) camera.ratio = cameraRatio;
		// TODO: Bug - when using the inspector calculated width doesn't match ratio everything looks squished on y axis
		// things pop in and out as you do more extreme scaling etc (very wide seems to be the issue)
		// setting force sphere culling doesn't help so it's an issue with the fustrum calculation itself
	};
	window.addEventListener('resize', updateCanvasSize);
	updateCanvasSize();

	Fury.init({ canvasId: glCanvasId });
	GUI.init(glCanvas);
	// GUI.Inspector.create("Inspector", playerMovementConfig, 20, 20, 200, "auto");

	// Create Loading GUI
	let playPromptDiv = GUI.appendElement(GUI.root, "div", { "class": "playPrompt" });
	GUI.appendElement(playPromptDiv, "h1").innerText = "Vorld Archipelago";
	let progressBarContainer = GUI.appendElement(playPromptDiv, "div");
	let progressBar = GUI.ProgressBar.create(progressBarContainer);
	progressBar.setProgress(0);
	// TODO: Only show progress bar if more than a certain amount of time passes when loading?
	// or just show a spinner

	let assetLoadingCount = 0;
	let totalAssetsToLoad = 0;
	let loadingCallback = () => {
		assetLoadingCount--;
		progressBar.setProgress((totalAssetsToLoad - assetLoadingCount) / totalAssetsToLoad);
		if (assetLoadingCount == 0) {
			setTimeout(onAssetLoadComplete, 250);
		}
	};
	let onAssetLoadComplete = () => {
		progressBarContainer.removeChild(progressBar.element);
		let playButton = GUI.appendElement(progressBarContainer, "input", { "type": "button", "value": "Play" });
		playButton.onclick = (e) => {
			Audio.play({ uri: uris[1], mixer: Audio.mixers["sfx"] });
			GUI.root.removeChild(playPromptDiv);
			start();
		};
	};

	let uris = [ "audio/bgm/Retro Mystic.ogg", "audio/sfx/ui/click1.ogg", "audio/sfx/ui/click2.ogg", "audio/sfx/ui/click3.ogg", "audio/sfx/ui/click4.ogg", "audio/sfx/ui/click5.ogg", "audio/sfx/ui/mouseclick1.ogg", "audio/sfx/ui/mouserelease1.ogg" ];
	Audio.createMixer("bgm", 0.25, Audio.mixers.master);
	Audio.createMixer("sfx", 1, Audio.mixers.master);
	Audio.fetchAudio(uris, null, loadingCallback);
	totalAssetsToLoad = assetLoadingCount = assetLoadingCount + uris.length;

	// Load Atlas Texture
	totalAssetsToLoad = assetLoadingCount++;
	let image = new Image();
	image.onload = function() {
		let shaderConfig = VoxelShader.create();
		let shader = Fury.Shader.create(shaderConfig);
		material = Fury.Material.create({ shader: shader, properties: { "fogColor": skyColor, "fogDensity": 0.005 }});
		alphaMaterial = Fury.Material.create({ shader: shader, properties: { alpha: true, "fogColor": skyColor, "fogDensity": 0.005 }});
		// ^^ to apply fog based on the depth of the water you're looking through properly, need to render depth buffer out from solid geometry pass
		// and use it as texture input, whilst this would be fun, it's a bit too much of a tangent right now, sooo quad in front of the camera! 
		// https://stackoverflow.com/questions/23362076/opengl-how-to-access-depth-buffer-values-or-gl-fragcoord-z-vs-rendering-d

		let upscaled = Fury.Utils.createScaledImage({ image: image, scale: 8 });
		let textureSize = upscaled.width, textureCount = Math.round(upscaled.height / upscaled.width);
		let textureArray = Fury.Renderer.createTextureArray(upscaled, textureSize, textureSize, textureCount, "pixel", true);
		material.setTexture(textureArray);
		alphaMaterial.setTexture(textureArray);
		loadingCallback();
	};
	image.src = "images/atlas_array.png";
});