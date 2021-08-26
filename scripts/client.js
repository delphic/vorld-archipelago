let Fury = require('../fury/src/fury');
const { vec3, quat } = require('../fury/src/maths');
let VoxelShader = require('../vorld/core/shader');
let VorldHelper = require('./vorldHelper');
let Player = require('./player');

let scene, camera, cameraRatio = 16 / 9;
let world = { boxes: [] }, vorld = null;
let material;
let player, spawnPlayer = true;

let initialBounds = {
	iMin: -6, iMax: 6,
	jMin: 0, jMax: 3,
	kMin: -6, kMax: 6
};

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

	Fury.GameLoop.init({ loop: loop, maxFrameTimeMs: 66 });
	Fury.GameLoop.start();
	vorld = VorldHelper.init({ scene: scene, material: material, bounds: initialBounds }, (data) => {
		// Spawn Player
		if (spawnPlayer) {
			player = Player.create({
				world: world,
				vorld: vorld,
				position: vec3.fromValues(12, 32, 12),
				camera: camera
			});
		}
	});
};

let loop = (elapsed) => {
	if (player) {
		player.update(elapsed);
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
	};
	window.addEventListener('resize', updateCanvasSize);
	updateCanvasSize();

	Fury.init({ canvasId: glCanvasId });

	// Load Atlas Texture
	let image = new Image();
	image.onload = function() {
		let shaderConfig = VoxelShader.create();
		let shader = Fury.Shader.create(shaderConfig);
		material = Fury.Material.create({ shader: shader });

		let upscaled = Fury.Utils.createScaledImage({ image: image, scale: 8 });
		let textureSize = upscaled.width, textureCount = Math.round(upscaled.height / upscaled.width);
		let textureArray = Fury.Renderer.createTextureArray(upscaled, textureSize, textureSize, textureCount, "pixel", true);
		material.setTexture(textureArray);
		start();
	};
	image.src = "images/atlas_array.png";
});