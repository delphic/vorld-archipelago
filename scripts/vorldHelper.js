let WorkerPool = require('./workerPool');
let Fury = require('../fury/src/fury');
let Maths = require('../fury/src/maths');
let vec3 = Maths.vec3;
let Vorld = require('../vorld/core/vorld');

module.exports = (function(){
	let exports = {};

	let scene = null, material = null;
	let generationWorkerPool = WorkerPool.create({ src: 'scripts/generator-worker.js', maxWorkers: 8 });
	let mesherWorkerPool = WorkerPool.create({ src: 'scripts/mesher-worker.js', maxWorkers: 4 });

	let generationConfig = {
		generationRules: {
			seed: "XUVNREAZOZJFPQMSAKEMSDJURTQPWEORHZMD",
			baseWavelength: 128,
			octaveWeightings: [0.5, 0.5, 1, 0.1],
			neutralNoise: true,	// Setting this to false just results in a single line of voxels... not really the intent
			thresholds: [ 0.5, 0.8 ],
			blocksByThreshold: [ 0, 2, 1 ],	// 0 = Air, 1 = Stone, 2 = Soil, 3 = Grass 
			verticalTransforms: [/*{
					conditions: [ "blockValue", "yMax" ],
					block: 0,
					yMax: -15,
					targetBlock: 1
				}, {
					conditions: [ "blockValue", "yRange" ],
					block: 0,
					yMin: -14,
					yMax: -14,
					targetBlock: 2
				},*/ {
					conditions: [ "blockValue", "blockAboveValue", "yMin" ],
					blockAbove: 0,
					block: 2,
					targetBlock: 3,
					yMin: 0
				}
			],
			shapingFunction: {
				name: "inverse_y",
				numerator: 100,
				yOffset: 0,
			}
		}
	};

	let meshingConfig = {
		atlas: {
			textureArraySize: 9,
			blockToTileIndex: [
				null,
				{ side: 3, top: 3, bottom: 3 }, // stone
				{ side: 2, top: 2, bottom: 2 }, // soil
				{ side: 1, top: 0, bottom: 2 }, // grass
			]
		}
	};

	let performWorkOnBounds = (workerPool, bounds, sectionSize, configDelegate, messageCallback, completeCallback) => {
		let iMin = bounds.iMin, iMax = bounds.iMax, kMin = bounds.kMin, kMax = bounds.kMax;
		let generatedSectionsCount = 0;
		let totalSectionsToGenerate = Math.ceil((iMax - iMin + 1) / sectionSize) * Math.ceil((kMax - kMin + 1) / sectionSize);

		let i = iMin, k = kMin;

		let workerMessageCallback = (data) => {
			messageCallback(data);
			if (data.complete) {
				generatedSectionsCount += 1;

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

	let generate = (bounds, callback) => {
		let vorld = Vorld.create();
		
		performWorkOnBounds(
			generationWorkerPool,
			bounds,
			1,
			(sectionBounds) => {
				generationConfig.bounds = sectionBounds;
				return generationConfig;
			},
			(data) => {
				if (data.complete) {
					Vorld.tryMerge(vorld, data.vorld);
				}
			},
			() => {
				meshVorld(vorld, bounds, callback);
			});

		return vorld;
	};
	
	let meshVorld = (vorld, bounds, callback) => {	
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
			(data) => {
				if (data.mesh) {
					let mesh = Fury.Mesh.create(data.mesh);
					mesh.tileBuffer = Fury.Renderer.createBuffer(data.mesh.tileIndices, 1);
					// TODO: Use customBuffer parameter - will require update to shader, see fury model demo for reference
					let position = vec3.clone(data.chunkIndices);
					vec3.scale(position, position, vorld.chunkSize);
					scene.add({ mesh: mesh, material: material, position: position, static: true });
				}
			},
			callback);
	};

	exports.init = (parameters, callback) => {
		scene = parameters.scene;
		material = parameters.material;
		return generate(parameters.bounds, callback);
	};

	return exports;
})();