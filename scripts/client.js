let Fury = require('../fury/src/fury');
const { GameLoop } = require('../fury/src/fury');
const { vec3, quat } = require('../fury/src/maths');
let Vorld = require('../vorld/core/vorld');
let VoxelShader = require('../vorld/core/shader');
let VorldHelper = require('./vorldHelper');
let Player = require('./player');
let GUI = require('./gui');
let Audio = require('./audio');
let Primitives = require('./primitives');
let TriggerZone = require('./triggerZone');
let Menu = require('./gui/menu');

let scene, overlayScene, camera, cameraRatio = 16 / 9;
let freeFlyCamera = null;
let world = { boxes: [] }, vorld = null;
let material, cutoutMaterial, alphaMaterial, unlitMaterial;
let player;
let skyColor = vec3.fromValues(136/255, 206/255, 235/255);
// waterColor : 0, 113, 144

// Move to random utils
let randomInt = (min, max) => {
	return min + Math.floor((Math.random() * (max - min + 1)));
};

let ccc;
let enableDayNightCycle = true; // Debug toggle for day night cycle (easier to test with endless day)

let smallInitialBounds = {
	iMin: -6, iMax: 6,
	jMin: -1, jMax: 3,
	kMin: -6, kMax: 6
};
let largeInitialBounds = {
	iMin: -20, iMax: 20,
	jMin: -1, jMax: 3,
	kMin: -20, kMax: 20
};
// TODO: Move config into actual config files - then the menu can be selecting between them
// TODO: Calculate point at which fog becomes ~1.0, set max draw distance to this and generation target distance to this

// TODO: Expose in Options Menu (from Main and Pause Menus)
let playerPrefs = {
	mouseLookSpeed: 0.25,
	forwardKey: "w",
	leftKey: "a",
	backKey: "s",
	rightKey: "d",
	upKey: "e",
	downKey: "q",
	jumpKey: "Space",
	walkKey: "Shift"
};

let playerMovementConfig = {
	acceleration: 80,
	maxWalkSpeed: 2,
	maxWadeSpeed: 3,
	maxSwimSpeed: 4,
	maxRunSpeed: 5.5,
	maxSprintSpeed: 8,
	stopSpeed: 1.5,
	airAcceleration: 10,
	airMaxMovementSpeed: 4,
	waterAcceleration: 10,
	waterMaxMovementSpeed: 4
};

let initialised = false, generating = false;
let setCameraInitialPosition = (camera) => {
	vec3.set(camera.position, 53.0, 55.0, 123.0),
	quat.set(camera.rotation, -0.232, 0.24, 0.06, 0.94)
};

let triggerZones = [];

// Portal activation Tracking
let orbsPlaced = 0;
let orbsToWin = 4; // TODO: Pass to vorld helper as number to spawn
let portalTrigger = null;

let onBlockPlaced = (block, x, y, z) => {
	let blockDef = Vorld.getBlockTypeDefinition(vorld, block);
	
	Audio.play({ uri: VorldHelper.buildSfxMaterialUri(blockDef.sfxMat, "add", randomInt(1, 4)), mixer: Audio.mixers["sfx"] });
	// TODO: If placed underwater / removing another block should also play removal sound?

	if (block == VorldHelper.blockIds["orb"]) {
		let previousOrbsPlaced = orbsPlaced;
		// Note - coupled to vorld helper's setting of meta data
		for (let i = 0, l = vorld.meta.portalPoints.length; i < l; i++) {
			let point = vorld.meta.portalPoints[i];
			if (point[0] == x && point[1] == y && point[2] == z) {
				orbsPlaced += 1;
			}
		}

		if (previousOrbsPlaced != orbsPlaced && orbsPlaced >= orbsToWin) {
			let points = vorld.meta.portalSurfacePoints; 
			if (portalTrigger == null && points && points.length) {
				let min = vec3.create(), max = vec3.create();
				
				let blockId = VorldHelper.blockIds["portal_surface"];
				for (let i = 0, l = points.length; i < l; i++) {
					if (i == 0) {
						vec3.copy(min, points[i]);
						vec3.add(max, points[i], [1,1,1]);
					} else {
						for (let j = 0; j < 3; j++) {
							min[j] = Math.min(min[j], points[i][j]);
							max[j] = Math.max(max[j], points[i][j] + 1);
						}
					}
					if (i + 1 == l) {
						// HACK: Only use vorld helper to add last block as it'll trigger the remeshing and we just want to do that once
						VorldHelper.addBlock(vorld, points[i][0], points[i][1], points[i][2], blockId);
					} else {
						Vorld.addBlock(vorld, points[i][0], points[i][1], points[i][2], blockId);
					}
				}
				triggerZones.push(TriggerZone.create(Fury.Bounds.create({ min: min, max: max }), () => {
					Fury.Input.releasePointerLock();
					pauseGame(createPortalEnteredNotification);
				}));
			}
		}
		// Arguably could deactivate the portal if you remove an orb
	}
};

let onBlockRemoved = (block, x, y, z) => {
	let blockDef = Vorld.getBlockTypeDefinition(vorld, block);
	Audio.play({ uri: VorldHelper.buildSfxMaterialUri(blockDef.sfxMat, "remove", randomInt(1, 4)), mixer: Audio.mixers["sfx"] });
	// TODO: if water filling the space play splash?

	if (block == VorldHelper.blockIds["orb"]) {
		// Note - coupled to vorld helper's setting of meta data
		for (let i = 0, l = vorld.meta.portalPoints.length; i < l; i++) {
			let point = vorld.meta.portalPoints[i];
			if (point[0] == x && point[1] == y && point[2] == z) {
				orbsPlaced -= 1;
			}
		}
	}
};

let start = (initialBounds, worldConfigId) => {
	if (!initialised) {
		// Create camera and scene
		camera = Fury.Camera.create({
			near: 0.1,
			far: 1000000.0,
			fov: 1.0472,
			ratio: cameraRatio,
			position: vec3.create(),
			rotation: quat.create()
		});
		setCameraInitialPosition(camera);
		scene = Fury.Scene.create({ camera: camera, enableFrustumCulling: true });
		overlayScene = Fury.Scene.create({ camera: camera });
		Fury.Renderer.clearColor(skyColor[0], skyColor[1], skyColor[2], 1.0);
		
		freeFlyCamera = require('./freeFlyCamera').create({
			rotateRate: 0.1,
			moveSpeed: 16,
			camera: camera
		});

		GameLoop.init({ loop: loop, maxFrameTimeMs: 66 });
		initialised = true;
	}
	GameLoop.start();

	let loadingScreen = createProgressScreen("Generating Vorld", "playPrompt");
	let currentLoadingText = "Generating Vorld";
	let lightingLoadingText = "Lighting Vorld";
	let meshingLoadingText = "Meshing Vorld";

	let spawnPlayer = () => {
		// Spawn Player
		if (player == null) {
			let spawnPoint = null;
			if (!vorld.meta) {
				vorld.meta = {};
				if (!vorld.meta.spawnPoint) {
					vorld.meta.spawnPoint = [12, 32, 12];
				}
			}
			spawnPoint = vec3.clone(vorld.meta.spawnPoint);
			orbsPlaced = 0;

			let playerConfig = {
				world: world,
				vorld: vorld,
				scene: scene,
				position: spawnPoint,
				quad: overlayScene.add({ mesh: Primitives.createQuadMesh(VorldHelper.getTileIndexBufferValueForBlock("water")), material: alphaMaterial, position: vec3.create() }),
				camera: camera,
				config: playerMovementConfig,
				prefs: playerPrefs,
				size: vec3.fromValues(0.75, 2, 0.75), // BUG: If you use size 0.8 - you can walk through blocks at axis = 7 when moving from axis = 8.
				stepHeight: 0.51,
				placementDistance: 5.5 + Math.sqrt(3),
				removalDistance: 5.5,
				onBlockPlaced: onBlockPlaced,
				onBlockRemoved: onBlockRemoved
			};
			// Massive Player!
			// playerConfig.size = vec3.fromValues(4,8,4);
			// playerConfig.stepHeight = 2.01;
			// Tiny Player
			// playerConfig.size = vec3.fromValues(0.25,0.5,0.25);
			// playerConfig.stepHeight = 0.26;
			player = Player.create(playerConfig);
		}

		Fury.Input.requestPointerLock();
		window.addEventListener('blur', handleWindowBlur);
		document.addEventListener('pointerlockchange', handlePointLockChange);
	};

	let onVorldCreated = () => { // data param is available
		generating = false;
		if (!Fury.GameLoop.isRunning()) {
			// If GameLoop paused call scene render manually to update view
			scene.render();
		}
		loadingScreen.showReadyButton("Enter Vorld", spawnPlayer);
	};

	generating = true;
	VorldHelper.generateRandomSeed(); // New seed each time!
	vorld = VorldHelper.init({
			scene: scene,
			material: material,
			cutoutMaterial: cutoutMaterial,
			alphaMaterial: alphaMaterial,
			unlitMaterial: unlitMaterial,
			bounds: initialBounds,
			configId: worldConfigId
		},
		onVorldCreated,
		(stage, count, total) => {
			if (stage == "lighting") {
				if (currentLoadingText != lightingLoadingText) {
					loadingScreen.setTitle(lightingLoadingText);
					currentLoadingText = lightingLoadingText;
				}
			}
			if (stage == "meshing") {
				if (count == total) {
					loadingScreen.setTitle("Ready!");
				} else if (currentLoadingText != meshingLoadingText) {
					loadingScreen.setTitle(meshingLoadingText);
					currentLoadingText = meshingLoadingText;
				}
			}
			loadingScreen.setProgress(count / total);
		});
	/* materials, startTime, timePeriod, updatePeriod, sunlightLevels, fogColors */
	let CCC = require('./circadianCycleController');
	ccc = CCC.create({
		materials: [ material, cutoutMaterial, alphaMaterial], // TODO: Pass unlit shader and a multipler factor array (0.5)
		startTime: 0.5,
		timePeriod: 240,
		sunlightLevels: CCC.lightCycle,
		fogColors: CCC.fogColorCycle,
		fogDensities: CCC.fogDensityCycle
	});
};

let pauseMenu = null, requestingLock = false, spinner = null;

let handlePointLockChange = () => {
	if (!Fury.Input.isPointerLocked()) {
		pauseGame(createPauseMenu);
	}
};

let handleWindowBlur = () => {
	pauseGame(createPauseMenu);
};

let pauseGame = (createUiDelegate) => {
	if (player && pauseMenu == null) {
		GameLoop.stop();
		pauseMenu = createUiDelegate((resume) => {
			if (resume && !requestingLock) {
				let onSuccess = () => { 
					requestingLock = false;
					if (spinner) { 
						GUI.root.removeChild(spinner);
						spinner = null;
					}
					pauseMenu = null;
					GameLoop.start();
				};
				// On Failing - try again
				let onFail = () => { 
					requestingLock = true;
					if (!spinner) {
						spinner = GUI.appendElement(GUI.root, "div", { "class": "spin" });
					}
					setTimeout(attemptLock, 250);
				};
				let attemptLock = () => { 
					let promise = Fury.Input.requestPointerLock();
					if (promise) { // Chrome & Edge returns a promise
						promise.then(onSuccess).catch(onFail); 
					} else { // Firefox does not
						onSuccess();
					}
				};
				attemptLock();
			}
			if (!resume) {
				window.removeEventListener('blur', handleWindowBlur);
				document.removeEventListener('pointerlockchange', handlePointLockChange);
				pauseMenu = null;
				GameLoop.start();
			}
		});
	}
};

let loop = (elapsed) => {
	if (player) {
		if (ccc && enableDayNightCycle) {
			ccc.update(elapsed);
		}

		player.update(elapsed);
		Audio.setListenerPosition(player.position);
		// TODO: listener orientation

		for (let i = 0, l = triggerZones.length; i < l; i++) {
			triggerZones[i].update(player);
		}

		// Note after having the same tab open for a long time with multiple refreshes:
		// a short time after refresh and generation long system tasks would block the main thread  
		// for over a second however closing that tab and openning a new one made it disappear
	} else if (!generating && freeFlyCamera) {
		freeFlyCamera.update(elapsed);
	}

	camera.clear = true;
	scene.render();
	camera.clear = false;
	overlayScene.render();
};

let playButtonClickSfx = () => {
	Audio.play({ uri: "audio/sfx/ui/click1.ogg", mixer: Audio.mixers["ui"] });
};

let createMainMenu = () => {
	let menu = Menu.create(
		GUI.root,
		"Select Mode", 
		[
			{ text: "Small Test Terrain", callback: () => {
				playButtonClickSfx();
				menu.remove();
				start(smallInitialBounds, "guassian_shaped_noise");
			} }, 
			{ text: "Large Test Terrain", callback: () => {
				playButtonClickSfx();
				menu.remove();
				start(largeInitialBounds, "guassian_shaped_noise");
			} }, 
			{ text: "Castle Test", callback: () => {
				playButtonClickSfx();
				menu.remove();
				start(smallInitialBounds, "castle");
			} }
		]);
};

let cleanUpWorld = () => {
	player = null;
	ccc = null;
	clearWorld();
	setCameraInitialPosition(camera);
	Fury.Renderer.clearColor(skyColor[0], skyColor[1], skyColor[2], 1.0); // TODO: Scenes should define their clear color
	scene.render();
};

let createPauseMenu = (onClose) => {
	let menu = Menu.create(
		GUI.root,
		"Paused",
		[
			{ text: "Resume Game", callback: () => {
				playButtonClickSfx();
				menu.remove();
				onClose(true);
			} },
			{ text: "Teleport to Start", callback: () => {
				playButtonClickSfx();
				player.teleport(vorld.meta.spawnPoint);
				menu.remove();
				onClose(true);
			} },
			{ text: "Main Menu", callback: () => {
				playButtonClickSfx();
				cleanUpWorld();
				menu.remove();
				createMainMenu();
				onClose(false);
			} }
		]);
	return menu;
};

let createPortalEnteredNotification = (onClose) => {
	// Dialogue popup might be better than just a menu
	let menu = Menu.create(
		GUI.root,
		"Enter Portal?", 
		[
			{ text: "Keep Exploring", callback: () => {
				playButtonClickSfx();
				menu.remove();
				onClose(true);
			} }, 
			{ text: "I'm Ready to Leave", callback: () => {
				playButtonClickSfx();
				cleanUpWorld();
				menu.remove();
				createMainMenu();
				onClose(false);
			} }
		]);
	return menu;
};

let createProgressScreen = (title, className) => {
	let ProgressBar = require('./gui/progressBar');

	let playPromptDiv = GUI.appendElement(GUI.root, "div", { "class": className });
	let titleElement = GUI.appendElement(playPromptDiv, "h1");
	titleElement.innerText = title;
	let progressBarContainer = GUI.appendElement(playPromptDiv, "div");
	let progressBar = ProgressBar.create(progressBarContainer);
	progressBar.setProgress(0);

	let showReadyButton = (text, onclick) => {
		progressBarContainer.removeChild(progressBar.element);
		let playButton = GUI.appendElement(progressBarContainer, "input", { "type": "button", "value": text });
		playButton.onclick = () => {
			playButtonClickSfx();
			GUI.root.removeChild(playPromptDiv);
			onclick();
		};
	};

	return {
		setProgress: progressBar.setProgress,
		setTitle: (text) => { titleElement.innerText = text; },
		showReadyButton: showReadyButton
	};
};

let clearWorld = () => {
	Vorld.clear(vorld);
	scene.clear();
	overlayScene.clear();
	Fury.Scene.clearResources();
};

window.addEventListener('load', () => {
	let glCanvasId = 'fury';
	
	// Full screen logic
	// TODO: Move to Fury.Utils
	let resolutionFactor = 1.0;
	let glCanvas = document.getElementById(glCanvasId);
	glCanvas.style = "width: 100%; height: 100vh";
	document.body.style = "margin: 0; overflow-y: hidden;";
	let updateCanvasSize = () => {
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

	let titleScreen = createProgressScreen("Vorld Archipelago", "playPrompt");

	let assetLoadingCount = 0;
	let totalAssetsToLoad = 0;
	let loadingCallback = () => {
		assetLoadingCount--;
		titleScreen.setProgress((totalAssetsToLoad - assetLoadingCount) / totalAssetsToLoad);
		if (assetLoadingCount == 0) {
			setTimeout(onAssetLoadComplete, 250);
		}
	};
	let onAssetLoadComplete = () => {
		titleScreen.showReadyButton("Play", createMainMenu);
	};

	let uris = [];

	// UI sounds
	uris.push("audio/sfx/ui/click1.ogg");
	// Material Sounds
	let matNames = VorldHelper.sfxMaterialNames;
	for (let i = 0, l = matNames.length; i < l; i++) {
		if (matNames[i] == "magic") {
			// HACK: Only 2 magic sounds
			uris.push(VorldHelper.buildSfxMaterialUri(matNames[i], null, 1));
			uris.push(VorldHelper.buildSfxMaterialUri(matNames[i], null, 2));
		} else {
			for (let stepNum = 1; stepNum <= 4; stepNum++) {
				uris.push(VorldHelper.buildSfxMaterialUri(matNames[i], "run", stepNum));
				uris.push(VorldHelper.buildSfxMaterialUri(matNames[i], "sneak", stepNum));
				uris.push(VorldHelper.buildSfxMaterialUri(matNames[i], "walk", stepNum));
				if (matNames[i] == "water") {
					uris.push(VorldHelper.buildSfxMaterialUri(matNames[i], "swim", stepNum));
				}
			}
		}

	}

	// Splash Sounds
	for (let i = 1; i <= 3; i++) {
		if (i < 3) uris.push(VorldHelper.buildSplashSfxUri(true, i, true));
		uris.push(VorldHelper.buildSplashSfxUri(true, i));
		uris.push(VorldHelper.buildSplashSfxUri(false, i));
	}

	Audio.createMixer("ui", 1, Audio.mixers.master);
	Audio.createMixer("sfx", 0.5, Audio.mixers.master);
	Audio.createMixer("sfx/footsteps", 0.25, Audio.mixers["sfx"]);
	Audio.createMixer("bgm", 0.25, Audio.mixers.master);
	Audio.fetchAudio(uris, null, loadingCallback);
	totalAssetsToLoad = assetLoadingCount = assetLoadingCount + uris.length;

	// Load Atlas Texture
	totalAssetsToLoad = assetLoadingCount++;
	let image = new Image();
	image.onload = function() {
		let shaderConfig = VoxelShader.create();
		let cutoutShaderConfig = VoxelShader.create(0.5); 
		// Cutout threshold needs to be 0.5 to prevent the shader 'evapourating' at distance, 
		// however this also requires a mag filter of nearest pixel to remove visible lines at edges
		let shader = Fury.Shader.create(shaderConfig);
		let cutoutShader = Fury.Shader.create(cutoutShaderConfig);

		let targetWidth = 128; // => Scale 8 for 16 pixels, 4 for 32 pixels, 2 for 64 pixels, 1 for 128 pixels+
		let scale = Math.ceil(targetWidth / image.width);  
		let upscaled = Fury.Utils.createScaledImage({ image: image, scale: scale });
		let textureSize = upscaled.width, textureCount = Math.round(upscaled.height / upscaled.width);
		let textureArray = Fury.Renderer.createTextureArray(upscaled, textureSize, textureSize, textureCount, "pixel", true);
		let nearestFilteredTextureArray = Fury.Renderer.createTextureArray(upscaled, textureSize, textureSize, textureCount, "low", true);

		material = Fury.Material.create({
			shader: shader,
			texture: textureArray,
			properties: { "fogColor": vec3.clone(skyColor), "fogDensity": 0.005, "ambientMagnitude": 0.5, "directionalMagnitude": 0.5 }
			});
		cutoutMaterial = Fury.Material.create({
			shader: cutoutShader,
			texture: nearestFilteredTextureArray,
			properties: { "fogColor": vec3.clone(skyColor), "fogDensity": 0.005, "ambientMagnitude": 0.5, "directionalMagnitude": 0.5 }
		});
		alphaMaterial = Fury.Material.create({
			shader: shader,
			texture: textureArray,
			properties: { alpha: true, blendSeparate: true, "fogColor": vec3.clone(skyColor), "fogDensity": 0.005, "ambientMagnitude": 0.5, "directionalMagnitude": 0.5 }
		});
		unlitMaterial = Fury.Material.create({
			shader: Fury.Shader.create(VoxelShader.createUnlit()),
			texture: textureArray,
			properties: { "fogColor": vec3.clone(skyColor), "fogDensity": 0.0025 }
		});

		loadingCallback();
	};
	image.src = "images/atlas.png";
});