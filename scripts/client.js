let Fury = require('../fury/src/fury');
const { vec3, quat } = require('../fury/src/maths');
let VoxelShader = require('../vorld/core/shader');
let VorldHelper = require('./vorldHelper');
let Player = require('./player');
let GUI = require('./gui');
let Audio = require('./audio');

let scene, camera, cameraRatio = 16 / 9;
let world = { boxes: [] }, vorld = null;
let material;
let player, spawnPlayer = true;
let skyColor = vec3.fromValues(136/255, 206/255, 235/255);

/*
let initialBounds = {
	iMin: -20, iMax: 20,
	jMin: -1, jMax: 3,
	kMin: -20, kMax: 20
};*/

let initialBounds = {	// Testing bounds
	iMin: -6, iMax: 6,
	jMin: -1, jMax: 3,
	kMin: -6, kMax: 6
};

let playerMovementConfig = {
	mouseLookSpeed: 0.25,	// TODO: This should be in player facing settings object
	acceleration: 80,
	maxWalkSpeed: 2,
	maxRunSpeed: 5.5,
	maxSprintSpeed: 8,
	stopSpeed: 1.5,
	airAcceleration: 10,
	airMaxMovementSpeed: 4
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
	Fury.Renderer.clearColor(skyColor[0], skyColor[1], skyColor[2]);

	Fury.GameLoop.init({ loop: loop, maxFrameTimeMs: 66 });
	Fury.GameLoop.start();
	vorld = VorldHelper.init({ scene: scene, material: material, bounds: initialBounds }, (data) => {
		// Spawn Player
		if (spawnPlayer) {
			player = Player.create({
				world: world,
				vorld: vorld,
				position: vec3.fromValues(12, 32, 12),
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
			Fury.Input.requestPointerLock();
		}
	});
};

let time = 0;
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
	scene.render();
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

	let assetLoadingCount = 0;
	let loadingCallback = () => {
		assetLoadingCount--;
		if (assetLoadingCount == 0) {
			start();
		}
	};

	assetLoadingCount++;
	let uris = [ "audio/bgm/Retro Mystic.ogg", "audio/sfx/ui/click1.ogg", "audio/sfx/ui/click2.ogg", "audio/sfx/ui/click3.ogg", "audio/sfx/ui/click4.ogg", "audio/sfx/ui/click5.ogg", "audio/sfx/ui/mouseclick1.ogg", "audio/sfx/ui/mouserelease1.ogg" ];
	Audio.fetchAudio(uris, ()=>{
		loadingCallback();
	});

	// Load Atlas Texture
	assetLoadingCount++;
	let image = new Image();
	image.onload = function() {
		let shaderConfig = VoxelShader.create();
		let shader = Fury.Shader.create(shaderConfig);
		material = Fury.Material.create({ shader: shader, properties: { "fogColor": skyColor, "fogDensity": 0.005 }});

		let upscaled = Fury.Utils.createScaledImage({ image: image, scale: 8 });
		let textureSize = upscaled.width, textureCount = Math.round(upscaled.height / upscaled.width);
		let textureArray = Fury.Renderer.createTextureArray(upscaled, textureSize, textureSize, textureCount, "pixel", true);
		material.setTexture(textureArray);
		loadingCallback();
	};
	image.src = "images/atlas_array.png";
});