let WorkerPool = require('./workerPool');
let Fury = require('../fury/src/fury');
let Maths = require('../fury/src/maths');
let vec3 = Maths.vec3;
let Vorld = require('../vorld/core/vorld');

module.exports = (function(){
	let exports = {};

	let scene = null, material = null, alphaMaterial = null;
	let sceneChunkObjects = {};
	let generationWorkerPool = WorkerPool.create({ src: 'scripts/generator-worker.js', maxWorkers: 8 });
	let mesherWorkerPool = WorkerPool.create({ src: 'scripts/mesher-worker.js', maxWorkers: 4 });
	let boundsCache = {};

	// TODO: Move to Fury primitives - also, this is a Cuboid, not a cube.
	let createCubeMesh = (xMin, xMax, yMin, yMax, zMin, zMax) => {
		// Note no UV offset - mapped directly to world position
		return {
			vertices: [
				// forward
				xMin, yMin, zMax,
				xMax, yMin, zMax,
				xMax, yMax, zMax,
				xMin, yMax, zMax,
				// back
				xMin, yMin, zMin,
				xMin, yMax, zMin,
				xMax, yMax, zMin,
				xMax, yMin, zMin,
				// up
				xMin, yMax, zMin,
				xMin, yMax, zMax,
				xMax, yMax, zMax,
				xMax, yMax, zMin,
				// down
				xMin, yMin, zMin,
				xMax, yMin, zMin,
				xMax, yMin, zMax,
				xMin, yMin, zMax,
				// right
				xMax, yMin, zMin,
				xMax, yMax, zMin,
				xMax, yMax, zMax,
				xMax, yMin, zMax,
				// left
				xMin, yMin, zMin,
				xMin, yMin, zMax,
				xMin, yMax, zMax,
				xMin, yMax, zMin ],
			normals: [
				// forward
				0.0, 0.0, 1.0,
				0.0, 0.0, 1.0,
				0.0, 0.0, 1.0,
				0.0, 0.0, 1.0,
				// back
				0.0, 0.0, -1.0,
				0.0, 0.0, -1.0,
				0.0, 0.0, -1.0,
				0.0, 0.0, -1.0,
				// up
				0.0, 1.0, 0.0,
				0.0, 1.0, 0.0,
				0.0, 1.0, 0.0,
				0.0, 1.0, 0.0,
				// down
				0.0, -1.0, 0.0,
				0.0, -1.0, 0.0,
				0.0, -1.0, 0.0,
				0.0, -1.0, 0.0,
				// right
				1.0, 0.0, 0.0,
				1.0, 0.0, 0.0,
				1.0, 0.0, 0.0,
				1.0, 0.0, 0.0,
				// left
				-1.0, 0.0, 0.0,
				-1.0, 0.0, 0.0,
				-1.0, 0.0, 0.0,
				-1.0, 0.0, 0.0],
			textureCoordinates: [
				// forward
				xMin, yMin,
				xMax, yMin,
				xMax, yMax,
				xMin, yMax,
				// back
				xMax, yMin,
				xMax, yMax,
				xMin, yMax,
				xMin, yMin,
				// up - NOTE: +y => -z
				xMin, zMax,
				xMin, zMin,
				xMax, zMin,
				xMax, zMax,
				// down - NOTE: +y => -z
				xMax, zMax,
				xMin, zMax,
				xMin, zMin,
				xMax, zMin,
				// right
				zMax, yMin,
				zMax, yMax,
				zMin, yMax,
				zMin, yMin,
				// left
				zMin, yMin,
				zMax, yMin,
				zMax, yMax,
				zMin, yMax ],
			indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23 ]
		};
	}; 

	let halfCubeJson = createCubeMesh(0.0, 1.0, 0.0, 0.5, 0.0, 1.0);

	let torchJson = createCubeMesh(0.4, 0.6, 0.0, 0.8, 0.4, 0.6);

	// Combined pair of cubes - top quad halved on lower, no bottom on upper - TODO: single quad at back
	let stepJson = {
		vertices: [ 
			// base
			// forward
			0.0, 0.0, 1.0,
			1.0, 0.0, 1.0,
			1.0, 0.5, 1.0,
			0.0, 0.5, 1.0,
			// back
			0.0, 0.0, 0.0,
			0.0, 0.5, 0.0,
			1.0, 0.5, 0.0,
			1.0, 0.0, 0.0,
			// up
			0.0, 0.5, 0.0,
			0.0, 0.5, 0.5,
			1.0, 0.5, 0.5,
			1.0, 0.5, 0.0,
			// down
			0.0, 0.0, 0.0,
			1.0, 0.0, 0.0,
			1.0, 0.0, 1.0,
			0.0, 0.0, 1.0,
			// right
			1.0, 0.0, 0.0,
			1.0, 0.5, 0.0,
			1.0, 0.5, 1.0,
			1.0, 0.0, 1.0,
			// left
			0.0, 0.0, 0.0,
			0.0, 0.0, 1.0,
			0.0, 0.5, 1.0,
			0.0, 0.5, 0.0, 
			// step
			// forward
			0.0, 0.5, 1.0,
			1.0, 0.5, 1.0,
			1.0, 1.0, 1.0,
			0.0, 1.0, 1.0,
			// back
			0.0, 0.5, 0.5,
			0.0, 1.0, 0.5,
			1.0, 1.0, 0.5,
			1.0, 0.5, 0.5,
			// up
			0.0, 1.0, 0.5,
			0.0, 1.0, 1.0,
			1.0, 1.0, 1.0,
			1.0, 1.0, 0.5,
			// right
			1.0, 0.5, 0.5,
			1.0, 1.0, 0.5,
			1.0, 1.0, 1.0,
			1.0, 0.5, 1.0,
			// left
			0.0, 0.5, 0.5,
			0.0, 0.5, 1.0,
			0.0, 1.0, 1.0,
			0.0, 1.0, 0.5 
		],
		normals: [
			// base
			// forward
			0.0, 0.0, 1.0,
			0.0, 0.0, 1.0,
			0.0, 0.0, 1.0,
			0.0, 0.0, 1.0,
			// back
			0.0, 0.0, -1.0,
			0.0, 0.0, -1.0,
			0.0, 0.0, -1.0,
			0.0, 0.0, -1.0,
			// up
			0.0, 1.0, 0.0,
			0.0, 1.0, 0.0,
			0.0, 1.0, 0.0,
			0.0, 1.0, 0.0,
			// down
			0.0, -1.0, 0.0,
			0.0, -1.0, 0.0,
			0.0, -1.0, 0.0,
			0.0, -1.0, 0.0,
			// right
			1.0, 0.0, 0.0,
			1.0, 0.0, 0.0,
			1.0, 0.0, 0.0,
			1.0, 0.0, 0.0,
			// left
			-1.0, 0.0, 0.0,
			-1.0, 0.0, 0.0,
			-1.0, 0.0, 0.0,
			-1.0, 0.0, 0.0,
			// step
			// forward
			0.0, 0.0, 1.0,
			0.0, 0.0, 1.0,
			0.0, 0.0, 1.0,
			0.0, 0.0, 1.0,
			// back
			0.0, 0.0, -1.0,
			0.0, 0.0, -1.0,
			0.0, 0.0, -1.0,
			0.0, 0.0, -1.0,
			// up
			0.0, 1.0, 0.0,
			0.0, 1.0, 0.0,
			0.0, 1.0, 0.0,
			0.0, 1.0, 0.0,
			// right
			1.0, 0.0, 0.0,
			1.0, 0.0, 0.0,
			1.0, 0.0, 0.0,
			1.0, 0.0, 0.0,
			// left
			-1.0, 0.0, 0.0,
			-1.0, 0.0, 0.0,
			-1.0, 0.0, 0.0,
			-1.0, 0.0, 0.0
		],
		textureCoordinates: [
			// base
			// forward
			0.0, 0.0,
			1.0, 0.0,
			1.0, 0.5,
			0.0, 0.5,
			// back
			1.0, 0.0,
			1.0, 0.5,
			0.0, 0.5,
			0.0, 0.0,
			// up
			0.0, 1.0,
			0.0, 0.5,
			1.0, 0.5,
			1.0, 1.0,
			// down
			1.0, 1.0,
			0.0, 1.0,
			0.0, 0.0,
			1.0, 0.0,
			// right
			1.0, 0.0,
			1.0, 0.5,
			0.0, 0.5,
			0.0, 0.0,
			// left
			0.0, 0.0,
			1.0, 0.0,
			1.0, 0.5,
			0.0, 0.5, 
			// step
			// forward
			0.0, 0.5,
			1.0, 0.5,
			1.0, 1.0,
			0.0, 1.0,
			// back
			1.0, 0.5,
			1.0, 1.0,
			0.0, 1.0,
			0.0, 0.5,
			// up
			0.0, 1.0,
			0.0, 0.5,
			1.0, 0.5,
			1.0, 1.0,
			// right // TODO: Double check these texture coords have been altered correctly
			0.5, 0.5,
			0.5, 1.0,
			0.0, 1.0,
			0.0, 0.5,
			// left
			0.5, 0.5,
			1.0, 0.5,
			1.0, 1.0,
			0.5, 1.0 
		],
		indices: [
			// base
			0, 1, 2, 
			0, 2, 3,
			4, 5, 6,
			4, 6, 7,
			8, 9, 10,
			8, 10, 11,
			12, 13, 14,
			12, 14, 15,
			16, 17, 18,
			16, 18, 19,
			20, 21, 22,
			20, 22, 23,
			// step
			24, 25, 26, 
			24, 26, 27,
			28, 29, 30,
			28, 30, 31,
			32, 33, 34,
			32, 34, 35,
			36, 37, 38,
			36, 38, 39,
			40, 41, 42,
			40, 42, 43,
		 ]
	};

	// TODO: Extract to config files rather than inline
	let gaussianShapingConfig = {
		name: "gaussian",
		// amplitude, sdx, sdz, denominator
		amplitude: 32,
		denominator: 8,
		sdx: 128,
		sdz: 256
	};
	let negativeYShapingConfig = {
		name: "negative_y",
		yDenominator: 32,
		yOffset: 128,
	};

	// Do not use with negative vertical extents unless you want insanity.
	let inverseYShapingConfig = {
		name: "inverse_y",
		numerator: 100,
		yOffset: 0,
	};

	// Custom collision specified as an array of AABB relative to mesh.bounds min
	let stepCollision = [
		{ min: [ 0.0, 0.0, 0.0 ], max: [ 1.0, 0.5, 1.0 ] },
		{ min: [ 0.0, 0.5, 0.5 ], max: [ 1.0, 1.0, 1.0 ] }
	];

	let blockIds = {
		"air": 0,
		"stone": 1,
		"soil": 2,
		"grass": 3,
		"wood": 4,
		"leaves": 5,
		"water": 6,
		"stone_blocks": 7,
		"stone_half": 8,
		"stone_step": 9,
		"planks": 10,
		"planks_half": 11,
		"planks_step": 12,
		"torch": 13,
		"test": 14
	};

	let blockConfig = [
		// Note: isOpaque is used to determine culling and light propogate, useAlpha currently used for alpha, isSolid used for collision logic
		// Note: if custom mesh provided and no collision, game uses mesh bounds as default collision AABB
		// TODO: option for different meshes / collisions based on adjaency (i.e. corner step meshes)
		{ name: "air", isOpaque: false, isSolid: false },
		{ name: "stone", isOpaque: true, isSolid: true },
		{ name: "soil", isOpaque: true, isSolid: true },
		{ name: "grass", isOpaque: true, isSolid: true },
		{ name: "wood", isOpaque: true, isSolid: true },
		{ name: "leaves", isOpaque: false, isSolid: true, meshInternals: true, attenuation: 2 },
		{ name: "water", isOpaque: false, isSolid: false, useAlpha: true, attenuation: 3 },
		{ name: "stone_blocks", isOpaque: true, isSolid: true },
		{ name: "stone_half", isOpaque: false, isSolid: true, mesh: halfCubeJson, attenuation: 2 },
		{ name: "stone_step", isOpaque: false, isSolid: true, mesh: stepJson, collision: stepCollision, attenuation: 3 }, 
		{ name: "planks", isOpaque: true, isSolid: true },
		{ name: "planks_half", isOpaque: false, isSolid: true, mesh: halfCubeJson, attenuation: 2 },
		{ name: "planks_step", isOpaque: false, isSolid: true, mesh: stepJson, collision: stepCollision, attenuation: 3 },
		{ name: "torch", isOpaque: false, isSolid: true, mesh: torchJson, light: 8 }, // TODO: Emissive mask to amp up light level and reduce fog build up
		{ name: "test", isOpaque: true, isSolid: true }
		// TODO: Add fence post mesh and block (provide full collision box)
		// TODO: Add ladder & vegatation / vines using cutout
	];

	/* atlas indices: 
	* 0: Grass Top
	* 1: Grass Side
	* 2: Soil / Grass Bottom
	* 3: Stone
	* 4: Stone Blocks (well currently brick pattern technically)
	* 5: Bedrock
	* 6: Wood top / bottom
	* 7: Wood side
	* 8: Wood Planks
	* 9: Leaves
	* 10: Water
	*/
	let meshingConfig = {
		atlas: {
			textureArraySize: 19,
			blockToTileIndex: [
				null,
				{ side: 3 }, // stone
				{ side: 2 }, // soil
				{ side: 1, top: 0, bottom: 2 }, // grass
				{ side: 7, top: 6, bottom: 6 }, // wood
				{ side: 9 }, // leaves
				{ side: 10 }, // water
				{ side: 4 }, // stone-blocks
				{ side: 4 }, // half-stone
				{ side: 4 }, // step-stone
				{ side: 8 }, // planks
				{ side: 8 }, // half-planks
				{ side: 8 }, // step-planks
				{ side: 11, top: 12, bottom: 8 }, 	// torch
				{ top: 13, bottom: 14, forward: 15, back: 16, right: 18, left: 17 } // test
			]
		}
		// blockConfig also effects meshing but this is stored on vorld data
	};

	// These are technically *terrain* generation configs
	let generationConfigs = {
		"flat": {
			generationRules: { 
				octaveWeightings: [],
				thresholds: [ 1 ],
				blocksByThreshold: [ 0 ],
				verticalTransforms: [{
					conditions: [ "blockValue", "yMax" ],
					block: blockIds.air,
					yMax: -4,
					targetBlock: blockIds.stone
				}, {
					conditions: [ "blockValue", "yMax" ],
					block: blockIds.air,
					yMax: -2,
					targetBlock: blockIds.soil
				}, {
					conditions: [ "blockValue", "yMax" ],
					block: blockIds.air,
					yMax: -1,
					targetBlock: blockIds.grass
				}
			]}
		},
		"guassian_shaped_noise": {
			generationRules: {
				seed: "XUVNREAZOZJFPQMSAKEMSDJURTQPWEORHZMD",
				baseWavelength: 128,
				octaveWeightings: [ 0.5, 0.5, 1, 0.1 ],
				neutralNoise: true,
				thresholds: [ 0.5, 0.8 ],
				blocksByThreshold: [ 0, 2, 1 ],	// 0 = Air, 1 = Stone, 2 = Soil, 3 = Grass 
				verticalTransforms: [{
						conditions: [ "blockValue", "yMax" ],
						block: blockIds.air,
						yMax: -15,
						targetBlock: blockIds.stone
					}, {
						conditions: [ "blockValue", "yRange" ],
						block: blockIds.air,
						yMin: -14,
						yMax: -14,
						targetBlock: blockIds.soil
					}, {
						conditions: [ "blockValue", "yMax" ],
						block: blockIds.air,
						yMax: 0,
						targetBlock: blockIds.water, 
					}, {
						conditions: [ "blockValue", "blockAboveValue", "yMin" ],
						blockAbove: blockIds.air,
						block: 2,
						targetBlock: blockIds.grass,
						yMin: 0
					}
				],
				shapingFunction: gaussianShapingConfig
			}
		}
	};
	generationConfigs["castle"] = generationConfigs["flat"]; // Reuse flat for castle test

	let lightingConfigs = {
		"day": { fogColor: vec3.fromValues(136/255, 206/255, 235/255), fogDensity: 0.005, ambientMagnitude: 0.5, directionalMagnitude: 0.5 },
		"foggy": { fogColor: vec3.fromValues(136/255, 206/255, 235/255), fogDensity: 0.05, ambientMagnitude: 0.5, directionalMagnitude: 0.5 },
		"night": { fogColor: vec3.fromValues(0, 0, 0.05), fogDensity: 0.05, ambientMagnitude: 0, directionalMagnitude: 0 } 
	};

	let performWorkOnBounds = (workerPool, bounds, sectionSize, configDelegate, messageCallback, completeCallback) => {
		let iMin = bounds.iMin, iMax = bounds.iMax, kMin = bounds.kMin, kMax = bounds.kMax;
		let generatedSectionsCount = 0;
		let totalSectionsToGenerate = Math.ceil((iMax - iMin + 1) / sectionSize) * Math.ceil((kMax - kMin + 1) / sectionSize);

		let i = iMin, k = kMin;

		let workerMessageCallback = (data) => {
			if (data.complete) {
				generatedSectionsCount += 1;
			}
			messageCallback(data, generatedSectionsCount, totalSectionsToGenerate);
			if (data.complete) {
				if (generatedSectionsCount >= totalSectionsToGenerate && completeCallback) {
					completeCallback();
				} else {
					tryStartNextWorker();
				}
			}
		};

		let tryStartNextWorker = () => {
			if (i <= iMax && k <= kMax) {
				startWorker(configDelegate({ 
						iMin: i,
						iMax: i + sectionSize - 1,
						jMin: bounds.jMin,
						jMax: bounds.jMax,
						kMin: k,
						kMax: k + sectionSize - 1 
					}), 
					workerMessageCallback);
				k += sectionSize;
				if (k > kMax) {
					k = kMin;
					i += sectionSize;
				}
				return true;
			}
			return false;
		};

		let startWorker = (config, callback) => {
			let worker = workerPool.requestWorker();
			worker.onmessage = (e) => {
				if (e.data.complete) {
					workerPool.returnWorker(worker);
				}
				if (callback) {
					callback(e.data);
				}
			};
			worker.postMessage(config);
		};

		while (workerPool.isWorkerAvailable() && tryStartNextWorker()) { }
	}; 

	let generate = (bounds, id, callback, progressDelegate) => {
		let vorld = Vorld.create({ blockConfig: blockConfig });
		let generationConfig = generationConfigs[id];

		performWorkOnBounds(
			generationWorkerPool,
			bounds,
			1,
			(sectionBounds) => {
				generationConfig.bounds = sectionBounds;
				return generationConfig;
			},
			(data, count, total) => {
				progressDelegate("generation", count, total);
				if (data.complete) {
					Vorld.tryMerge(vorld, data.vorld);
				}
			},
			() => {
				if (id == "castle") {
					// Castle Generator TEST
					// TODO: generation should be multi-pass, first terrain, then buildings, then meshing
					// and arguably meshing should be a separate concern as we'll want to add / remove meshes as we move around on large worlds
					// Also each stage should be easy to extract into a web worker
					let CastleGenerator = require('./generators/castle/generator');
					let sliceBounds = { xMin: -3, xMax: 3, zMin: -3, zMax: 3, yMin: 0, yMax: 20 };
					let config = { 
						vorld: Vorld.createSliceFromBounds(vorld, sliceBounds),
						bounds : sliceBounds,
						blocks: { wall: [ blockIds.stone, blockIds.stone_blocks ], floor: [ blockIds.planks ], step: [ blockIds.stone_half, blockIds.stone_step ] }
					}
					CastleGenerator.generate(config, (data) => {
						Vorld.tryMerge(vorld, data.vorld)
						meshVorld(vorld, bounds, callback, progressDelegate);
					});
				} else {
					meshVorld(vorld, bounds, callback, progressDelegate);
				}
			});

		return vorld;
	};
	
	let meshVorld = (vorld, bounds, callback, progressDelegate) => {	
		performWorkOnBounds(
			mesherWorkerPool,
			bounds,
			3,
			(sectionBounds) => {
				meshingConfig.bounds = sectionBounds;
				meshingConfig.vorld = Vorld.createSlice(
					vorld,
					sectionBounds.iMin - 1,
					sectionBounds.iMax + 1,
					sectionBounds.jMin - 1,
					sectionBounds.jMax + 1,
					sectionBounds.kMin - 1,
					sectionBounds.kMax + 1);
				return meshingConfig;
			},
			(data, count, total) => {
				progressDelegate("meshing", count, total); // Note: data contains.progress could also just send that
				if (data.mesh) {
					let mesh = Fury.Mesh.create(data.mesh);
					let position = vec3.clone(data.chunkIndices);
					vec3.scale(position, position, vorld.chunkSize);
					let chunkMaterial = data.alpha ? alphaMaterial : material;
					let key = data.chunkIndices[0] + "_" + data.chunkIndices[1] + "_" + data.chunkIndices[2];
					if (!sceneChunkObjects[key]) {
						sceneChunkObjects[key] = [];
					}
					sceneChunkObjects[key].push(scene.add({ mesh: mesh, material: chunkMaterial, position: position, static: true }));
				}
			},
			callback);
	};

	exports.addBlock = (vorld, x, y, z, block, up, forward) => {
		let chunkIndices = Maths.vec3Pool.request();
		chunkIndices[0] = Math.floor(x / vorld.chunkSize);
		chunkIndices[1] = Math.floor(y / vorld.chunkSize);
		chunkIndices[2] = Math.floor(z / vorld.chunkSize); 
		let key = chunkIndices[0] + "_" + chunkIndices[1] + "_" + chunkIndices[2];
		// ^^ TODO: Vorld Utils
		Vorld.addBlock(vorld, x, y, z, block, up, forward);
		// TODO: Maybe addBlock could take an out for blocks/chunks modified
		// Or we could mark chunks dirty and on remesh set them clean

		let xMin = x, xMax = x, yMin = y, yMax = y, zMin = z, zMax = z;

		// Remesh all adjacent chunks
		// as light propogation changes can effect up to 16 blocks away
		xMin -= vorld.chunkSize;
		xMax += vorld.chunkSize;
		yMin -= vorld.chunkSize;
		yMax += vorld.chunkSize;
		zMin -= vorld.chunkSize;
		zMax += vorld.chunkSize;
		// if no light propogation changes, could just remesh if on a boundary 
		// and so would effect mesh faces and or AO on existing faces.

		/* Attempt at calculating the chunks changed
		let blockDef = Vorld.getBlockTypeDefinition(vorld, block); 
		let light = blockDef ? blockDef.light : 0;
		if (!block || (blockDef && !blockDef.isOpaque)) {
			// Allows propogration of light where potentially there was none before
			// TODO: check if there was a block here before and check adjacent light level 
			// to determine actual level of repropogation needed
			xMin -= vorld.chunkSize;
			xMax += vorld.chunkSize;
			yMin -= vorld.chunkSize;
			yMax += vorld.chunkSize;
			zMin -= vorld.chunkSize;
			zMax += vorld.chunkSize;
		} else if (!light) {
			// Up to light distance if block casts light
			xMin = x - light; 
			xMax = x + light;
			yMin = y - light;
			yMax = y + light;
			zMin = z - light;
			zMax = z + light;
		} else {
			// Need to check adjacent and diagonally adjacent to account for AO bake
			for (let i = -1; i <= 1; i++) {
				for (let j = -1; j <= 1; j++) {
					for (let k = -1; k <= 1; k++) {
						if (Vorld.getBlock(vorld, x + i, y + j, z +k)) {
							xMin = Math.min(xMin, x + i);
							xMax = Math.max(xMax, x + i);
							yMin = Math.min(yMin, y + j);
							yMax = Math.max(yMax, y + j);
							zMin = Math.min(zMin, z + k);
							zMax = Math.max(zMax, z + k);
						}
					}
				}
			}
		}*/

		boundsCache.iMin = Math.floor(xMin / vorld.chunkSize);
		boundsCache.iMax = Math.floor(xMax / vorld.chunkSize);
		boundsCache.jMin = Math.floor(yMin / vorld.chunkSize);
		boundsCache.jMax = Math.floor(yMax / vorld.chunkSize);
		boundsCache.kMin = Math.floor(zMin / vorld.chunkSize);
		boundsCache.kMax = Math.floor(zMax / vorld.chunkSize);

		Maths.vec3Pool.return(chunkIndices);

		let pendingMeshData = [];
		// Could potentially do this on main thread instead.
		performWorkOnBounds(mesherWorkerPool, boundsCache, 1,
			(sectionBounds) => {
				meshingConfig.bounds = sectionBounds;
				meshingConfig.vorld = Vorld.createSlice(
					vorld,
					sectionBounds.iMin - 1,
					sectionBounds.iMax + 1,
					sectionBounds.jMin - 1,
					sectionBounds.jMax + 1,
					sectionBounds.kMin - 1,
					sectionBounds.kMax + 1);
				return meshingConfig;
			}, (data, count, total) => {
				if (data.mesh) {
					pendingMeshData.push(data);
				}
			}, () => {
				// If removing a block, always remove existing scene objects first
				// (as it may be the last block in a chunk at which point it there will be no pending mesh data to remesh)
				if (!block && sceneChunkObjects[key]) {
					for (let j = 0, n = sceneChunkObjects[key].length; j < n; j++) {
						scene.remove(sceneChunkObjects[key][j]);
					}
					if (pendingMeshData.length == 0) {
						sceneChunkObjects[key] = null;
					} else {
						sceneChunkObjects[key].length = 0;
					}
				}

				// Remove all scene objects for remeshed chunks
				for (let i = 0, l = pendingMeshData.length; i < l; i++) {
					let data = pendingMeshData[i];
					let key = data.chunkIndices[0] + "_" + data.chunkIndices[1] + "_" + data.chunkIndices[2];
					if (sceneChunkObjects[key]) {
						for (let j = 0, n = sceneChunkObjects[key].length; j < n; j++) {
							scene.remove(sceneChunkObjects[key][j]);
						}
						sceneChunkObjects[key].length = 0;
					} else {
						sceneChunkObjects[key] = [];
					}
				}

				// The Remeshening
				for (let i = 0, l = pendingMeshData.length; i < l; i++) {
					let data = pendingMeshData[i];
					let key = data.chunkIndices[0] + "_" + data.chunkIndices[1] + "_" + data.chunkIndices[2];
					let mesh = Fury.Mesh.create(data.mesh);
					let position = vec3.clone(data.chunkIndices);
					vec3.scale(position, position, vorld.chunkSize);
					let chunkMaterial = data.alpha ? alphaMaterial : material;
					sceneChunkObjects[key].push(scene.add({ mesh: mesh, material: chunkMaterial, position: position, static: true }));
				}
			});
	};

	exports.removeBlock = (vorld, x, y, z) => {
		// Check horizontally adjacent blocks for water
		let adjacentWaterBlock = false;
		for (let i = -1; i <= 1; i++) {
			for (let j = -1; j <= 1; j++) {
				if ((i != 0 || j != 0) && Math.abs(i) != Math.abs(j)) {
					if (Vorld.getBlock(vorld, x + i, y, z + j) == blockIds.water) {
						adjacentWaterBlock = true;
						break;
					}
				}
			}
		}
		// Also check above for water
		if (Vorld.getBlock(vorld, x, y + 1, z) == blockIds.water) {
			adjacentWaterBlock = true;
		}
		// TODO: Replace this with flow simulation so that more than the 
		// block you're removing can get filled once exposed to water 
		// Or just do a graph search and fill all appropriate blocks from here

		if (!adjacentWaterBlock) {
			exports.addBlock(vorld, x, y, z, 0);
		} else {
			exports.addBlock(vorld, x, y, z, blockIds.water);
		}
	};

	exports.init = (parameters, callback, progressDelegate) => {
		scene = parameters.scene;
		material = parameters.material;
		alphaMaterial = parameters.alphaMaterial;

		// Apply lighting settings - arguably should be on scene and materials should have bindLighting method taking scene
		let lightingConfig = null;
		switch(parameters.configId) {
			case "castle": 
				lightingConfig = lightingConfigs["night"];
				break;
			default:
				lightingConfig = lightingConfigs["day"];
				break;
		}
		material.setProperties(lightingConfig);
		alphaMaterial.setProperties(lightingConfig);
		Fury.Renderer.clearColor(lightingConfig.fogColor[0], lightingConfig.fogColor[1], lightingConfig.fogColor[2], 1.0);

		return generate(parameters.bounds, parameters.configId, callback, progressDelegate);
	};

	return exports;
})();