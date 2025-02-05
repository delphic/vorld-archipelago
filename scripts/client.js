const Fury = require('fury');
const { Maths, GameLoop, Random } = Fury;
const { vec3, quat } = Maths;
const {
	BlockConfig,
	World: Vorld,
	Lighting: VorldLighting,
	Shader: VoxelShader,
	Primitives: VorldPrimitives,
	Updater: VorldUpdater
} = require('vorld');
const VorldHelper = require('./vorldHelper');
const Player = require('./player');
const GUI = require('./gui');
const Audio = require('./audio');
const Primitives = require('./primitives');
const TriggerZone = require('./triggerZone');
const Menu = require('./gui/menu');
const Dialog = require('./gui/dialog');

let scene, overlayScene, camera, cameraRatio = 16 / 9;
let freeFlyCamera = null;
let world = { boxes: [], entities: [] }, vorld = null;
let material, cutoutMaterial, alphaMaterial, unlitMaterial, dynamicMaterial;
let player;
let skyColor = vec3.fromValues(136/255, 206/255, 235/255);
// waterColor : 0, 113, 144

let debug = false; // Determines options available in various GUI settings && creative mode

let ccc;
let enableDayNightCycle = !debug; // Debug toggle for day night cycle (easier to test with endless day)

let smallInitialBounds = {
	iMin: -6, iMax: 6,
	jMin: -1, jMax: 3,
	kMin: -6, kMax: 6
};
let mediumInitialBounds = {
	iMin: -10, iMax: 10,
	jMin: -1, jMax: 3,
	kMin: -10, kMax: 10
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
	upKey: "Space",
	downKey: "Shift",
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
	let blockDef = BlockConfig.getBlockTypeDefinition(vorld, block);
	
	Audio.play({ uri: VorldHelper.buildSfxMaterialUri(blockDef.sfxMat, "add", Random.roll(1, 4)), mixer: Audio.mixers["sfx"] });
	// TODO: If placed underwater / removing another block should also play removal sound?

	if (block == VorldHelper.blockIds["orb"] && vorld.meta.portalPoints) {
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
						VorldUpdater.addBlock(vorld, points[i][0], points[i][1], points[i][2], blockId);
					}
				}
				portalTrigger = TriggerZone.create(Fury.Bounds.create({ min: min, max: max }), () => {
					vec3.zero(player.velocity);
					Fury.Input.releasePointerLock();
					pauseGame(createPortalEnteredNotification);
				});
				triggerZones.push(portalTrigger);
			}
		}
		// Arguably could deactivate the portal if you remove an orb
	}
};

let onBlockRemoved = (block, x, y, z) => {
	let blockDef = BlockConfig.getBlockTypeDefinition(vorld, block);
	Audio.play({ uri: VorldHelper.buildSfxMaterialUri(blockDef.sfxMat, "remove", Random.roll(1, 4)), mixer: Audio.mixers["sfx"] });
	// TODO: if water filling the space play splash?

	if (block == VorldHelper.blockIds["orb"] && vorld.meta.portalPoints) {
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
			ratio: cameraRatio
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
			}
			if (!vorld.meta.spawnPoint) {
				vorld.meta.spawnPoint = [12, 32, 12];
			}
			spawnPoint = vec3.clone(vorld.meta.spawnPoint);
			orbsPlaced = 0;

			let quadMat = Object.create(dynamicMaterial);
			quadMat.id = null;

			let playerConfig = {
				world: world,
				vorld: vorld,
				scene: scene,
				position: spawnPoint,
				quad: overlayScene.add({ mesh: Primitives.createQuadMesh(VorldHelper.getTileIndexBufferValueForBlock("water")), material: quadMat, position: vec3.create() }),
				orb: overlayScene.add({ mesh: Fury.Mesh.create(VorldHelper.getHeldOrbMeshData()), material: unlitMaterial, position: vec3.create() }), // HACK - should be able to hold more than just an orb
				camera: camera,
				config: playerMovementConfig,
				prefs: playerPrefs,
				size: vec3.fromValues(0.75, 2, 0.75), // BUG: If you use size 0.8 - you can walk through blocks at axis = 7 when moving from axis = 8.
				stepHeight: 0.51,
				placementDistance: 5.5 + Math.sqrt(3),
				removalDistance: 5.5,
				enableCreativeMode: debug,
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

		// HACK - based on generation id - add dynamic objects to world (which VorldHelper doesn't have access to, but arguably should (?))
		if (vorld.meta && vorld.meta.id == "test") {
			console.log("Is test scene, adding dynamic stuff!");
			let GameEntity = require('./gameEntity');
			let lightingObject = GameEntity.create();
			let position = vec3.fromValues(0, 1, 0);

			let meshConfig = VorldPrimitives.createCuboidMeshJson(-0.25, 0.25, -0.25, 0.25, -0.25, 0.25);
			Primitives.appendTileIndices(meshConfig, VorldHelper.getTileIndexBufferValueForBlock("stone") || 0);


			// NOTE: if you update vorld submodule then add lightLevel and sunlightLevel to scene object instance
			// and remove the cloning of the material per instance 
			let mesh = Fury.Mesh.create(meshConfig);
			let materialInstance = Object.create(dynamicMaterial);
			materialInstance.id = null;
			lightingObject.so = scene.add({ mesh: mesh, material: materialInstance, position: position });

			lightingObject.addComponent("light-test", { 
				update: (elapsed) => {
					position[0] = 5 * Math.sin(GameLoop.time);
					materialInstance.lightLevel = VorldLighting.interpolateLight(vorld, position);
					materialInstance.sunlightLevel = VorldLighting.interpolateSunlight(vorld, position);
					// CCC updates dynamic material with sunlight level etc
				}
			});

			world.entities.push(lightingObject);
			enableDayNightCycle = true;
		}

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
			dynamicMaterial: dynamicMaterial,
			bounds: initialBounds,
			configId: worldConfigId,
			debug: debug
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
		materials: [ material, cutoutMaterial, alphaMaterial, dynamicMaterial], // TODO: Pass unlit shader and a multipler factor array (0.5)
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

		for (let i = 0, l = world.entities.length; i < l; i++) {
			world.entities[i].update(elapsed);
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
	camera.clearDepth = true;
	overlayScene.render();
	camera.clear = true;	
};

let playButtonClickSfx = () => {
	Audio.play({ uri: "audio/sfx/ui/click1.ogg", mixer: Audio.mixers["ui"] });
};

let createIntroPrompt = () => {
	let text = [ "You've been transported to a mysterious island chain.",
		"Retrieve the glowing orbs and place them on the pedestals to reactive the portal if you want to escape.",
		"Requires a keyboard and mouse to play." ];
	let dialog = Dialog.create(GUI.root, "Welcome to the Archipelago", text, "Continue", () => {
		playButtonClickSfx();
		dialog.remove();
		createMainMenu();
	});
};

let createControlsPrompt = (onClose) => {
	let text = [ "Use the mouse to look around and WASD to move.", 
		"You can double tap W to sprint and press shift to walk.",
		"Use left click to interact with objects.",
		"Use right click to place held objects.",
		"Use Space to jump.",
		"When swimming use Space to rise and Shift to fall.",
		"Press F11 to toggle full-screen." ];
	let dialog = Dialog.create(GUI.root, "Controls", text, "Ok", () => {
		playButtonClickSfx();
		dialog.remove();
		onClose();
	});
};

let createAboutPrompt = (onClose) => {
	let text = [ "Created by <a href=\"https://bsky.app/profile/delphic.bsky.social\">delphic</a> for 7DFPS 2021.",
		"The game procedurally generates a different world each time you play!",
		"Source available on <a href=\"https://github.com/delphic/vorld-archipelago\">github</a>." ];
	let dialog = Dialog.create(GUI.root, "About", text, "Ok", () => {
		playButtonClickSfx();
		dialog.remove();
		onClose();
	});
};

let createThanksForPlayingPrompt = () => {
	let text = [ "Thanks for playing!", 
		"A different world is generated each time you play so why not play again?",
		"Created by <a href=\"https://bsky.app/profile/delphic.bsky.social\">delphic</a> for 7DFPS 2021." ];
		let dialog = Dialog.create(GUI.root, "Congratulations", text, "Main Menu", () => {
			playButtonClickSfx();
			dialog.remove();
			createMainMenu();
		});
};

let createModeSelectMenu = () => {
	let menu = null;
	let buttons = null;

	if (debug) {
		buttons = [
			{ text: "Debug", callback: () => {
				playButtonClickSfx();
				menu.remove();
				start(smallInitialBounds, "guassian_shaped_noise");
			} }, 
			{ text: "Test", callback: () => {
				playButtonClickSfx();
				menu.remove();
				start(smallInitialBounds, "test");
			} },
			{ text: "Easy (Smaller World)", callback: () => {
				playButtonClickSfx();
				menu.remove();
				start(mediumInitialBounds, "guassian_shaped_noise");
			} },
			{ text: "Hard (Larger World)", callback: () => {
				playButtonClickSfx();
				menu.remove();
				start(largeInitialBounds, "guassian_shaped_noise");
			} }, 
			{ text: "Castle", callback: () => {
				playButtonClickSfx();
				menu.remove();
				start(smallInitialBounds, "castle");
			} }
		];
	} else {
		buttons = [
			{ text: "Easy (Smaller World)", callback: () => {
				playButtonClickSfx();
				menu.remove();
				start(mediumInitialBounds, "guassian_shaped_noise");
			} },
			{ text: "Hard (Larger World)", callback: () => {
				playButtonClickSfx();
				menu.remove();
				start(largeInitialBounds, "guassian_shaped_noise");
			} }
		];
	}
	menu = Menu.create(GUI.root, "Select Mode", buttons);

};

let createMainMenu = () => {
	let menu = Menu.create(
		GUI.root,
		"Vorld Archipelago", 
		[
			{ text: "Play", callback: () => {
				playButtonClickSfx();
				menu.remove();
				createModeSelectMenu();
			} }, 
			{ text: "Controls", callback: () => {
				playButtonClickSfx();
				menu.remove();
				createControlsPrompt(createMainMenu);
			} },
			{ text: "About", callback: () => {
				playButtonClickSfx();
				menu.remove();
				createAboutPrompt(createMainMenu);
			} }
		]);
};

let cleanUpWorld = () => {
	portalTrigger = null;
	triggerZones.length = 0;
	player = null;
	ccc = null;
	clearWorld();
	setCameraInitialPosition(camera);
	Fury.Renderer.clearColor(skyColor[0], skyColor[1], skyColor[2], 1.0); // TODO: Scenes should define their clear color
	scene.render();
};

let createPauseMenu = (onClose) => {
	let buttons = [
		{ text: "Resume Game", callback: () => {
			playButtonClickSfx();
			menu.remove();
			onClose(true);
		} },
		{ text: "Controls", callback: () => {
			playButtonClickSfx();
			menu.remove();
			createControlsPrompt(() => { createPauseMenu(onClose) });
		} },
		{ text: "Main Menu", callback: () => {
			playButtonClickSfx();
			cleanUpWorld();
			menu.remove();
			createMainMenu();
			onClose(false);
		} } ];
	if (debug) {
		buttons.push({ text: "Teleport to Start", callback: () => {
			playButtonClickSfx();
			player.teleport(vorld.meta.spawnPoint);
			menu.remove();
			onClose(true);
		} });
	}

	let menu = Menu.create(
		GUI.root,
		"Paused",
		buttons);
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
				createThanksForPlayingPrompt();
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
	window.addEventListener('resize', () => {
		// Check for 'F11' fullscreen
		if (screen.height == window.innerHeight) {
			GUI.setStyles(fullscreenButton, { "display": "none" });
		} else {
			GUI.setStyles(fullscreenButton, { "display": "block" });
		}
		updateCanvasSize();
	});
	updateCanvasSize();

	Fury.init({ canvasId: glCanvasId });
	GUI.init(glCanvas);

	// We don't want tab cycling through elements to change window focus causing game to pause / unpause
	// However it is useful to allow it to pause the game, so if pointer is locked unlock it (which will trigger pause)
	// NOTE: If we were to display an input form we might want to allow cycling via tab though
	document.body.addEventListener('keydown', e => { 
		if (e.code == 'Tab') {
			if (Fury.Input.isPointerLocked()) {
				Fury.Input.releasePointerLock();
				e.preventDefault();
			}
			// BUG - still possible to mess up pause count by shift - tabbing in pause menu
			// if you're paused and not in full screen, would be good if we could prevent this
		}
	});

	let holder = document.getElementById("furyHolder");
	let fullscreenButton = GUI.appendElement(GUI.root, "div", { class: "fullscreenButton" });
	GUI.setStyles(fullscreenButton, { bottom: 32, right: 32, width: 32, height: 32  });

	holder.addEventListener("fullscreenchange", () => {
		if (!Fury.GameLoop.isRunning() && scene) {
			updateCanvasSize(); // Ensure re-size, order of events can been reversed when entering fullscreen
			scene.render();
		}
		if (document.fullscreenElement) {
			GUI.setStyles(fullscreenButton, { "display": "none" });
		} else {
			GUI.setStyles(fullscreenButton, { "display": "block" });
		}
	});

	fullscreenButton.addEventListener("click", () => {
		holder.requestFullscreen();
	});

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
		let callback = debug ? createMainMenu : createIntroPrompt;
		titleScreen.showReadyButton("Play", callback);
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
		let textureConfig = { source: upscaled, width: textureSize, height: textureSize, imageCount: textureCount, clamp: true };
		textureConfig.quality = "pixel";
		let textureArray = Fury.Texture.createTextureArray(textureConfig);
		textureConfig.quality = "low";
		let nearestFilteredTextureArray = Fury.Texture.createTextureArray(textureConfig);

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
		dynamicMaterial = Fury.Material.create({
			shader: Fury.Shader.create(VoxelShader.createDynamic()),
			texture: textureArray,
			properties: { alpha: true, blendSeparate: true, "fogColor": vec3.clone(skyColor), "fogDensity": 0.005, "ambientMagnitude": 0.5, "directionalMagnitude": 0.5, "lightLevel": 0, "sunlightLevel": 0 }
		});
		// NOTE: if you update vorld submodule then remove lightLevel and sunlightLevel here, add them to scene object instance
		// and remove the cloning of the material per instance 

		loadingCallback();
	};
	image.src = "images/atlas.png";
});