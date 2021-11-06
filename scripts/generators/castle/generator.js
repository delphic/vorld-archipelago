let Vorld = require('../../../vorld/core/vorld');
let VorldUtils = require('../../../vorld/core/utils');

let Generator = module.exports = (function(){
	let exports = {};

	let forVolume = VorldUtils.forVolume;

	let createSpiralStair = (vorld, sxMin, sxMax, syMin, syMax, szMin, szMax, x, y, z, direction, halfBlock) => {
		// x, y, z are start coordinate, first 6 parameters are bounds
		// Alternating inverted half blocks for a steady increase
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
	};

	let generate = (config, onProgress, onComplete) => {
		let vorld = config.vorld;
		let bounds = config.bounds;
		let wallBlock = config.blocks.wall[0];
		let cornerBlock = config.blocks.wall[1];
		let halfBlock = config.blocks.step[0];
		let stepBlock = config.blocks.step[1];
		let floorBlock = config.blocks.floor[0];

		// TODO: Support non rectangluar shapes (e.g. L and T shapes as well as O/tofu shapes)
		// TODO: Calculate bounds from config - i.e. number of floors and tower width
		let xMin = bounds.xMin, xMax = bounds.xMax,
			yMin = bounds.yMin, yMax = bounds.yMax,
			zMin = bounds.zMin, zMax = bounds.zMax;

		// TODO: Update so we're not going outside the provided bounds eh?

		// Base && outer elements
		forVolume(xMin - 1, xMax + 1, yMin, yMin + 7, zMin - 1, zMax + 1, (x, y, z) => { 
			// Add base but with steps up
			if (y == yMin) {
				if (x == Math.floor((xMax - xMin)/2) + xMin  && (z == zMin - 1 || z == zMax + 1)) {
					let forward = z == zMin -1 ? Vorld.Cardinal.Direction.forward : Vorld.Cardinal.Direction.back;
					Vorld.addBlock(vorld, x, y, z, stepBlock, Vorld.Cardinal.Direction.up, forward);
				} else {
					Vorld.addBlock(vorld, x, y, z, cornerBlock);
				}
			} else {
				if (z == Math.floor((zMax - zMin)/2) + zMin && (x == xMin-1 || x == xMax + 1) && y == yMin + 1) {
					Vorld.addBlock(vorld, x, y, z, halfBlock);
				} else if (((x == xMin || x == xMax) && ((z == zMin - 1) || (z == zMax + 1))) 
					|| ((x == xMin - 1 || x == xMax + 1) && (z == zMin || z == zMax))) {
					if (y < yMin + 7) {
						Vorld.addBlock(vorld, x, y, z, cornerBlock);
					} else {
						let up = Vorld.Cardinal.Direction.up
						let forward = Vorld.Cardinal.Direction.forward; 
						if (x == xMin - 1) {
							forward = Vorld.Cardinal.Direction.right;
						} else if (x == xMax + 1) {
							forward = Vorld.Cardinal.Direction.left;
						} else if (z == zMax + 1) {
							forward = Vorld.Cardinal.Direction.back;
						}
						Vorld.addBlock(vorld, x, y, z, stepBlock, up, forward);
					}
				}
			}
		});

		// Simple Tower
		forVolume(xMin, xMax, yMin, yMax, zMin, zMax, (x, y, z) => {
			// Doors and steps into tower
			let isOnXMidPoint = x == Math.floor((xMax - xMin)/2) + xMin;
			let isOnZMidPoint = z == Math.floor((zMax - zMin)/2) + zMin;
			let isOnXEdge = (x == xMin || x == xMax);
			let isOnZEdge = (z == zMin || z == zMax);
			let isDoorY = y > yMin && y <= yMin + 2;
			let isWindowY = ((y + 2 - yMin) % 5 == 0 || (y + 3 - yMin) % 5 == 0) && y + 5 < yMax;
			if (isOnXMidPoint && isOnZEdge && isDoorY) {
				// Don't do anything we want doors!
			}
			else if (((isOnXMidPoint && isOnZEdge) || (isOnZMidPoint && isOnXEdge)) && isWindowY
				&& !(isOnXMidPoint && isOnZEdge && y <= yMin + 5)) { // Not a wall with a door!
				// Don't do anything we want windows!
				if ((y + 3 - yMin) % 5 == 0) {
					Vorld.addBlock(vorld, x, y, z, halfBlock);
				} else {
					Vorld.addBlock(vorld, x, y, z, halfBlock, Vorld.Cardinal.Direction.down);
				}
			}
			// Walls
			else if (((x == xMin || x == xMax) || (z == zMin || z == zMax)) && y < yMax - 2) {
				if ((x == xMin || x == xMax) && (z == zMin || z == zMax)) {
					Vorld.addBlock(vorld, x, y, z, cornerBlock);
				} else {
					if ((y - yMin) % 5 == 0 || (y > yMax - 5)) {
						Vorld.addBlock(vorld, x, y, z, cornerBlock);
					} else {
						Vorld.addBlock(vorld, x, y, z, wallBlock);
					}
				}
			} 
			// Inter floors
			else if (y > yMin && (y - yMin) % 5 == 0 && y < yMax - 5) {
				Vorld.addBlock(vorld, x, y, z, floorBlock);
			}
		});

		// Battlements
		forVolume(xMin - 1, xMax + 1, yMax - 3, yMax - 1, zMin - 1, zMax + 1, (x, y, z) => { 
			// Along the edges
			if ((x == xMin - 1 || x == xMax + 1) || (z == zMin - 1 || z == zMax + 1)) {
				// But not the corners
				if (!((x == xMin - 1 || x == xMax + 1) && (z == zMin - 1 || z == zMax + 1))) {
					if (y == yMax -2) {
						// Add a ring
						Vorld.addBlock(vorld, x, y, z, cornerBlock);
					} else if (
						(x % 2 != 0 && (z == zMin - 1 || z == zMax + 1))
						|| (z % 2 != 0 && (x == xMin - 1 || x == xMax + 1))) {
						if (y == yMax - 1) {
							// Topped with half blocks
							Vorld.addBlock(vorld, x, y, z, halfBlock);
						} else {
							// And 'supported' with step blocks
							let up = Vorld.Cardinal.Direction.down;
							let forward = Vorld.Cardinal.Direction.forward; 
							if (x == xMin - 1) {
								forward = Vorld.Cardinal.Direction.right;
							} else if (x == xMax + 1) {
								forward = Vorld.Cardinal.Direction.left;
							} else if (z == zMax + 1) {
								forward = Vorld.Cardinal.Direction.back;
							}
							Vorld.addBlock(vorld, x, y, z, stepBlock, up, forward);
						}
					}
				}
			} else if (y == yMax -3) {
				Vorld.addBlock(vorld, x, y, z, cornerBlock);
			}
		});

		// Create Spiral Stairs for each floor
		let y = yMin + 1;
		while (y < yMax - 10) {
			createSpiralStair(
				vorld,
				xMin + 1, xMax -1,
				y, y + 4,
				zMin + 1, zMax - 1,
				xMin + 1, y, zMin + 2, 0,
				halfBlock);
			y += 5;
		}
		createSpiralStair(
			vorld,
			xMin + 1, xMax -1,
			y, yMax - 3,
			zMin + 1, zMax - 1,
			xMin + 1, y, zMin + 2, 0,
			halfBlock);		

		onComplete({ vorld: vorld });
	};

	exports.generate = (config, onComplete, onProgress) => {
		onProgress = onProgress || ((progress) => { console.log("Progress: " + progress); });
		generate(config, onProgress, onComplete);
	};

	return exports;
})();