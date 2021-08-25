let WorkerPool = module.exports = (function() {
	// TODO: Also used by fury-demo Voxel Terrain, consider moving to submodule
	let exports = {};

	let prototype = {
		maxWorkers: 8,
		isWorkerAvailable: function() {
			return this.inUseWorkerCount < this.maxWorkers;
		},
		requestWorker: function() {
			if (this.workerSrc) {
				for (let i = 0; i < this.maxWorkers; i++) {
					if (!this.workerInUse[i]) {
						if (!this.workers[i]) {
							this.workers[i] = new Worker(this.workerSrc);
							this.workers[i].workerIndex = i;
						}
						this.workerInUse[i] = true;
						this.inUseWorkerCount++;
						return this.workers[i];
					}
				}
			}
			return null;
		},
		returnWorker: function(worker) {
			this.workerInUse[worker.workerIndex] = false;
			this.inUseWorkerCount--;
		}
	};

	exports.create = function(config) {
		let pool = Object.create(prototype);
		pool.workerSrc = config.src;
		if (config.maxWorkers) pool.maxWorkers = config.maxWorkers;
		pool.inUseWorkerCount = 0;
		pool.workers = [];
		pool.workerInUse = [];

		return pool;
	};

	return exports;
})();