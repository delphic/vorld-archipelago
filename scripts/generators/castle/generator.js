let Vorld = require('../../../vorld/core/vorld');
let VorldUtils = require('../../../vorld/core/utils');

let Generator = module.exports = (function(){
	let exports = {};

	let forVolume = VorldUtils.forVolume;

	let generate = (config, onProgress, onComplete) => {
		let vorld = config.vorld;
		let bounds = config.bounds;
		let wallBlock = config.blocks.wall[0];
		let halfBlock = config.blocks.step[0];
		let stepBlock = config.blocks.step[1];
		// TODO: Support non rectangluar shapes (e.g. L and T shapes as well as O/tofu shapes)
		let xMin = bounds.xMin, xMax = bounds.xMax,
			yMin = bounds.yMin, yMax = bounds.yMax,
			zMin = bounds.zMin, zMax = bounds.zMax;

		let facing = Vorld.Cardinal.Direction.right;
		// TEST: Simple hollow tower
		forVolume(xMin, xMax, yMin, yMax, zMin, zMax, (x, y, z) => {
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

		// A Spiral Stair Case! (Well a helix but okay)
		// Alternating inverted half blocks for a steady increase
		let sxMin = xMin + 1, sxMax = xMax - 1, szMin = zMin + 1, szMax = zMax - 1; 
		let syMin = yMin + 1, syMax = yMax;

		let x = sxMin, y = syMin, z = szMin + 1;
		let direction = 0; // forward, left, back, right

		for (let i  = 0; y < syMax || (y == syMax && i % 2 == 0); i++) {
			let invertBlock = i % 2 == 1;
			Vorld.addBlock(vorld, x, y, z, halfBlock, Vorld.Cardinal.Direction.up + i % 2, Vorld.Cardinal.Direction.forward);

			// Make sure you have Headroom
			for (let j = 1, n = invertBlock ? 3 : 2; j <= n; j++) {
				if (Vorld.getBlock(vorld, x, y+j, z)) {
					Vorld.addBlock(vorld, x, y+j, z, 0);
				}
			}

			if (i % 2 == 1) {
				y += 1;
			}

			switch (direction) {
				case 0:
					z += 1;
					if (z == szMax) direction = (direction + 1) % 4;
					break;
				case 1:
					x += 1;
					if (x == sxMax) direction = (direction + 1) % 4;
					break;
				case 2:
					z -= 1;
					if (z == szMin) direction = (direction + 1) % 4;
					break;
				case 3:
					x -= 1;
					if (x == sxMin) direction = (direction + 1) % 4;
					break;
			}
		}

		onComplete({ vorld: vorld });
	};

	exports.generate = (config, onComplete, onProgress) => {
		onProgress = onProgress || ((progress) => { console.log("Progress: " + progress); });
		generate(config, onProgress, onComplete);
	};

	return exports;
})();