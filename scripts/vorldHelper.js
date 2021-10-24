let WorkerPool = require('./workerPool');
let Fury = require('../fury/src/fury');
let Maths = require('../fury/src/maths');
let vec3 = Maths.vec3;
let Vorld = require('../vorld/core/vorld');

module.exports = (function(){
	let exports = {};

	let scene = null, material = null, alphaMaterial = null;
	let generationWorkerPool = WorkerPool.create({ src: 'scripts/generator-worker.js', maxWorkers: 8 });
	let mesherWorkerPool = WorkerPool.create({ src: 'scripts/mesher-worker.js', maxWorkers: 4 });

	// TODO: IMPORTANT we really need to do a pass on handness because when I updated the UVs for right what I thought was left updated instead...
	// this is made more complex by the fact the camera points in -z. It updated right from the perspective of the camera, but I expected it to update the other side
	// It's made even more complex by noting the camera does not spawn facing in -z it's at an angle to give a nice view... so it could in fact still be fine.
	// On the other hand when I specificed step block to face right when spawning first on the left hand side it was stepping in the direction I thought it should....

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
		"planks_step": 12
	};

	let blockConfig = [
		// Note: isOpaque is used to determine culling, useAlpha currently used for alpha, isSolid used for collision logic
		// Note: if custom mesh provided and no collision, game uses mesh bounds as default collision AABB
		// TODO: option for different meshes / collisions based on adjaency (i.e. corner step meshes)
		{ name: "air", isOpaque: false, isSolid: false },
		{ name: "stone", isOpaque: true, isSolid: true },
		{ name: "soil", isOpaque: true, isSolid: true },
		{ name: "grass", isOpaque: true, isSolid: true },
		{ name: "wood", isOpaque: true, isSolid: true },
		{ name: "leaves", isOpaque: false, isSolid: true },
		// TODO: need to mesh internal sides (for own blocks) & back faces on 'external sides' (meshInternals and meshBackFaces - but inset to avoid z-fighting)
		// (or disable backface culling - would need a new material and then in bind material to do that, but would need to add an unbind method to reenable)
		// In order to use a new material would need another mesh created instead of packing into existing mesh 
		// Note turning off back face cull may result in z-fighting so will need to alter meshing algorithm to inset quad for cutouts slightly from solid blocks
		{ name: "water", isOpaque: false, isSolid: false, useAlpha: true },
		{ name: "stone_blocks", isOpaque: true, isSolid: true },
		{ name: "stone_half", isOpaque: false, isSolid: true, mesh: halfCubeJson },
		{ name: "stone_step", isOpaque: false, isSolid: true, mesh: stepJson, collision: stepCollision }, 
		{ name: "planks", isOpaque: true, isSolid: true },
		{ name: "planks_half", isOpaque: false, isSolid: true, mesh: halfCubeJson },
		{ name: "planks_step", isOpaque: false, isOpaque: true, mesh: stepJson, collision: stepCollision }
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
			textureArraySize: 11,
			blockToTileIndex: [
				null,
				{ side: 3, top: 3, bottom: 3 }, // stone
				{ side: 2, top: 2, bottom: 2 }, // soil
				{ side: 1, top: 0, bottom: 2 }, // grass
				{ side: 7, top: 6, bottom: 6 }, // wood
				{ side: 9, top: 9, bottom: 9 }, // leaves
				{ side: 10, top: 10, bottom: 10 }, // water
				{ side: 4, top: 4, bottom: 4 }, // stone-blocks
				{ side: 4, top: 4, bottom: 4 }, // half-stone
				{ side: 4, top: 4, bottom: 4 }, // step-stone
				{ side: 8, top: 8, bottom: 8 }, // planks
				{ side: 8, top: 8, bottom: 8 }, // half-planks
				{ side: 8, top: 8, bottom: 8 }, // step-planks
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
					mesh.tileBuffer = Fury.Renderer.createBuffer(data.mesh.tileIndices, 1);
					// TODO: Use customBuffer parameter - will require update to shader, see fury model demo for reference
					let position = vec3.clone(data.chunkIndices);
					vec3.scale(position, position, vorld.chunkSize);
					let chunkMaterial = data.alpha ? alphaMaterial : material;
					scene.add({ mesh: mesh, material: chunkMaterial, position: position, static: true });
				}
			},
			callback);
	};

	exports.init = (parameters, callback, progressDelegate) => {
		scene = parameters.scene;
		material = parameters.material;
		alphaMaterial = parameters.alphaMaterial;
		return generate(parameters.bounds, parameters.configId, callback, progressDelegate);
	};

	return exports;
})();