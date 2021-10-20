let Vorld = require('../../../vorld/core/vorld');
let VorldUtils = require('../../../vorld/core/utils');

let Generator = module.exports = (function(){
	let exports = {};

	let forVolume = VorldUtils.forVolume;

	let generate = (config, onProgress, onComplete) => {
		let vorld = config.vorld;
		let bounds = config.bounds;
		let wallBlock = config.blocks.wall[0];
		let stepBlock = config.blocks.step[0];
		// TODO: Support non rectangluar shapes (e.g. L and T shapes as well as O/tofu shapes)
		let xMin = bounds.xMin, xMax = bounds.xMax,
			yMin = bounds.yMin, yMax = bounds.yMax,
			zMin = bounds.zMin, zMax = bounds.zMax;

		let facing = Vorld.Cardinal.Direction.right;
		forVolume(xMin, xMax, yMin, yMax, zMin, zMax, (x, y, z) => {
			// TEST: Simple hollow tower
			if (x == Math.floor((xMax - xMin)/2) + xMin && y <= yMin + 2 && (z == zMin || z == zMax)) {
				if (y == yMin) {
					let forward = z == zMin ? Vorld.Cardinal.Direction.forward : Vorld.Cardinal.Direction.back;
					Vorld.addBlock(vorld, x, y, z, stepBlock, Vorld.Cardinal.Direction.up, forward);
				}
			}
			else if ((x == xMin || x == xMax) || (y == yMin || y == yMax) || (z == zMin || z == zMax)) {
				if ((x == xMin || x == xMax) && y == yMax && (z == zMin || z == zMax)) {
					Vorld.addBlock(vorld, x, y, z, stepBlock, Vorld.Cardinal.Direction.up, facing);
					if (facing == Vorld.Cardinal.Direction.left) {
						facing = Vorld.Cardinal.Direction.right;
					} else {
						facing = Vorld.Cardinal.Direction.left;
					}
				} else {
					Vorld.addBlock(vorld, x, y, z, wallBlock);
				}
			}
		});

		onComplete({ vorld: vorld });
	};

	exports.generate = (config, onComplete, onProgress) => {
		onProgress = onProgress || ((progress) => { console.log("Progress: " + progress); });
		generate(config, onProgress, onComplete);
	};

	return exports;
})();