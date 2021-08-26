// TODO: either update to read voxels *or* have sweep build aabb out of voxels
const { vec3 } = require('../fury/src/maths');
const { Maths, Physics } = require('../fury/src/fury');
const Vorld = require('../vorld/core/vorld')

let CharacterController = module.exports = (() => {
	let exports = {};
	
	// Used to store collisions, with minimum times and indices
	let CollisionInfo = (() => {
		let exports = {};

		exports.copy = (out, a) => {
			out.overlapCount = a.overlapCount;
			out.collisionsBuffer.length = out.overlapCount; 
			// Only stores relevant elements from buffer - previous matches left in buffer are discarded
			for(let i = 0; i < out.overlapCount; i++) { 
				out.collisionsBuffer[i] = a.collisionsBuffer[i];
			}
			for (let i = 0; i < 3; i++) {
				out.minTime[i] = a.minTime[i];
				out.minIndex[i] = a.minIndex[i]; 
			}
		};

		exports.create = () => {
			return {
				collisionsBuffer: [],
				minTime: [],
				minIndex: [],
				overlapCount: 0
			};
		};

		return exports;
	})();

	let voxelBoxes = (function(){
		// Not a proper pool
		let boxes = [];
		let exports = {};
		let nextIndex = 0;

		for (let i = 0; i < 20; i++) {
			boxes[i] = Physics.Box.create({ min: vec3.create(), max: vec3.create() });
		}

		let requestBox = (x, y, z) =>{
			if (nextIndex < boxes.length) {
				let result = boxes[nextIndex++];
				vec3.set(result.min, x, y, z);
				vec3.set(result.max, x+1, y+1, z+1);
				nextIndex++;
				return result;
			}
			return boxes[nextIndex++] = Physics.Box.create({ min: vec3.fromValues(x, y, z), max: vec3.fromValues(x+1, y+1, z+1) });
		};

		// Quick and dirty sweep, AABB per non-0 voxel
		// Not sure this is working!
		exports.sweep = (out, vorld, sweepBox) => {
			let xMin = Math.floor(sweepBox.min[0]);
			let xMax = Math.floor(sweepBox.max[0]);
			let yMin = Math.floor(sweepBox.min[1]);
			let yMax = Math.floor(sweepBox.max[1]);
			let zMin = Math.floor(sweepBox.min[2]);
			let zMax = Math.floor(sweepBox.max[2]);

			for (let x = xMin; x <= xMax; x++) {
				for (let y = yMin; y <= yMax; y++) {
					for (let z = zMin; z <= zMax; z++) {
						if (Vorld.getBlock(vorld, x, y, z)) {
							out.push(requestBox(x,y,z)); 
						}
					}
				}
			}
			// Reset counter - only one sweep is valid at a time 
			nextIndex = 0;
		};

		return exports;
	})();

	let playerCollisionInfo = CollisionInfo.create();
	let collisionInfoCache = CollisionInfo.create();
	let relevantBoxes = []; // Array used to store sub-set of boxes to consider for XZ calculations

	let checksEntersAxis = (out, box, playerBox, axis, collisionBufferIndex, targetPosition, playerPosition, elapsed) => {
		let delta = targetPosition[axis] - playerPosition[axis];
		if (Math.abs(delta) > 0 && Physics.Box.entersAxis(box, playerBox, axis, delta)) {
			checkMinTime(out, box, playerBox, axis, collisionBufferIndex, elapsed, delta);
			return true;
		}
		return false;
	};

	let checkMinTime = (out, box, playerBox, axis, collisionBufferIndex, elapsed, delta) => {
		let distance = 0;
		if (delta > 0) {
			// player max will cross box min
			distance = playerBox.max[axis] - box.min[axis];
		} else {
			// player min will cross box max
			distance = playerBox.min[axis] - box.max[axis];
		}
		let time = distance / Math.abs(delta / elapsed);
		if (time < out.minTime[axis]) {
			out.minTime[axis] = time;
			out.minIndex[axis] = collisionBufferIndex;
		}
	};

	let sweepForRevelantBoxes = (() => {
		let min = vec3.create();
		let max = vec3.create();
		let delta = vec3.create();
		let sweepBox = Physics.Box.create({ min: min, max: max });

		return (out, vorld, boxes, playerBox, targetPosition, currentPosition, stepHeight) => {
			// This could probably be broken into 2 util methods and moved to Fury
			// box.expand (by delta) & world.getAllOverlaps (box)
			vec3.subtract(delta, targetPosition, currentPosition);
			min[0] = Math.min(playerBox.min[0] + delta[0], playerBox.min[0]);
			min[1] = Math.min(playerBox.min[1] + delta[1], playerBox.min[1]);  
			min[2] = Math.min(playerBox.min[2] + delta[2], playerBox.min[2]);
			max[0] = Math.max(playerBox.max[0] + delta[0], playerBox.max[0]);
			max[1] = Math.max(playerBox.max[1] + delta[1], playerBox.max[1]) + stepHeight;  
			max[2] = Math.max(playerBox.max[2] + delta[2], playerBox.max[2]);
			sweepBox.recalculateExtents();
	
			let overlapCount = 0;
			for (let i = 0, l = boxes.length; i < l; i++) {
				if (Physics.Box.intersect(boxes[i], sweepBox)) {
					out[overlapCount] = boxes[i];
					overlapCount += 1;
				}
			}
			out.length = overlapCount;

			// Add voxel boxes
			if (vorld) {
				voxelBoxes.sweep(out, vorld, sweepBox);
			}
		}; 
	})();

	let getTouchPointTarget = (closestBox, playerBox, axis, delta) => {
		if (delta <= 0) {
			// new target position max + extents
			return closestBox.max[axis] + playerBox.extents[axis];
		} else {
			// new target position min - extents
			return closestBox.min[axis] - playerBox.extents[axis];
		}
	};

	exports.create = (parameters) => {
		let controller = {};
	
		// private variables
		let targetPosition = vec3.create();	
		let lastPosition = vec3.create();
		let world = parameters.world;
		let vorld = parameters.vorld;
		let playerPosition = parameters.playerPosition;
		let playerBox = parameters.playerBox;
		let stepHeight = 0;
		if (parameters.stepHeight) {
			stepHeight = parameters.stepHeight;
		}

		// private methods 
		let tryStep = (axis, maxStepHeight, elapsed) => {
			let stepSuccess = false;
			let collisionsBuffer = playerCollisionInfo.collisionsBuffer;
			let minIndex = playerCollisionInfo.minIndex;
			if (collisionsBuffer[minIndex[axis]].max[1] < maxStepHeight) {
				// Try step!
				let targetY = targetPosition[1];
				targetPosition[1] = collisionsBuffer[minIndex[axis]].max[1] + playerBox.extents[1]; 
				// alt ^^: playerPosition[1] + collisionsBuffer[minIndex[axis]].max[1] - playerBox.min[1];
				CollisionInfo.copy(collisionInfoCache, playerCollisionInfo);
				if (checkForPlayerCollisions(playerCollisionInfo, relevantBoxes, elapsed) == 0) {
					stepSuccess = true;
					// Only step if it's completely clear to move to the target spot for ease
				} else {
					// TODO: If collision is only in axis of primary movement, consider sidestep 
					targetPosition[1] = targetY;
					CollisionInfo.copy(playerCollisionInfo, collisionInfoCache);
				}
			}
			return stepSuccess;
		};

		let checkForPlayerCollisions = (out, boxes, elapsed) => {
			let overlapCount = 0;
			let collisionCount = 0;
			
			out.minIndex[0] = out.minIndex[1] = out.minIndex[2] = -1;
			out.minTime[0] = out.minTime[1] = out.minTime[2] = elapsed + 1;
		
			for (let i = 0, l = boxes.length; i < l; i++) {
				let box = boxes[i];
		
				let deltaX = targetPosition[0] - playerPosition[0];
				let deltaY = targetPosition[1] - playerPosition[1];
				let deltaZ = targetPosition[2] - playerPosition[2];
				let intersectsX = Physics.Box.intersectsAxisOffset(box, playerBox, 0, deltaX);
				let entersX = deltaX && Physics.Box.entersAxis(box, playerBox, 0, deltaX);
				let intersectsY = Physics.Box.intersectsAxisOffset(box, playerBox, 1, deltaY);
				let entersY = deltaY && Physics.Box.entersAxis(box, playerBox, 1, targetPosition[1] - playerPosition[1]);
				let intersectsZ = Physics.Box.intersectsAxisOffset(box, playerBox, 2, deltaZ);
				let entersZ = deltaZ && Physics.Box.entersAxis(box, playerBox, 2, targetPosition[2] - playerPosition[2]);
		
				if ((intersectsX || entersX) && (intersectsY || entersY) && (intersectsZ || entersZ)
					&& (entersX || entersY || entersZ)) {
					if (entersX) checkMinTime(out, box, playerBox, 0, overlapCount, elapsed, deltaX);
					if (entersY) checkMinTime(out, box, playerBox, 1, overlapCount, elapsed, deltaY);
					if (entersZ) checkMinTime(out, box, playerBox, 2, overlapCount, elapsed, deltaZ);
		
					out.collisionsBuffer[overlapCount] = box;
					collisionCount += 1;
					overlapCount += 1;
				} else if (intersectsX && intersectsY && intersectsZ) {
					out.collisionsBuffer[overlapCount] = box;
					overlapCount += 1;
				}
			}
		
			out.overlapCount = overlapCount;
		
			return collisionCount;
		};
		
		// Y Axis only version of checkForPlayerCollisions
		// Logic can be simplified when assuming no XZ movement
		let checkForPlayerCollisionsY = (out, boxes, elapsed) => {
			let collisionCount = 0;
			let overlapCount = 0;
			
			out.minIndex[0] = out.minIndex[1] = out.minIndex[2] = -1;
			out.minTime[0] = out.minTime[1] = out.minTime[2] = elapsed + 1;
		
			// Note enters axis does not do a box cast, merely checks current against new
			// i.e. you can move through boxes at high enough speed - TODO: box cast 
			for (let i = 0, l = boxes.length; i < l; i++) {
				if (Physics.Box.intersectsAxis(boxes[i], playerBox, 0) && Physics.Box.intersectsAxis(boxes[i], playerBox, 2)) {
					if (checksEntersAxis(out, boxes[i], playerBox, 1, overlapCount, targetPosition, playerPosition, elapsed)) {
						out.collisionsBuffer[overlapCount] = boxes[i];
						collisionCount += 1;
						overlapCount += 1;
					} else if (Physics.Box.intersectsAxis(boxes[i], playerBox, 1)) {
						out.collisionsBuffer[overlapCount] = boxes[i];
						overlapCount += 1;
					}
				}
			}
		
			out.overlapCount = overlapCount;
		
			return collisionCount;
		};

		// Public Methods
		let teleport = controller.teleport = (targetPosition) => {
			vec3.copy(playerPosition, targetPosition);
			// playerBox.center has changed because it's set to the playerPosition ref
			// TODO: Ensure this is the case currently it's up to consuming code to set it up correctly
			playerBox.recalculateMinMax();
		};

		controller.moveXZ = (velocity, elapsed) => {
			vec3.copy(lastPosition, playerPosition);
			vec3.copy(targetPosition, playerPosition);
			vec3.scaleAndAdd(targetPosition, targetPosition, Maths.vec3X, velocity[0] * elapsed);
			vec3.scaleAndAdd(targetPosition, targetPosition, Maths.vec3Z, velocity[2] * elapsed);

			// As we might be checking collision repeatedly sweep out maximal set first
			sweepForRevelantBoxes(relevantBoxes, vorld, world.boxes, playerBox, targetPosition, playerPosition, stepHeight);
			// TODO: ^^ This could be replaced by a World partitioning system and a method to retrieve locally revelant collision boxes 

			checkForPlayerCollisions(playerCollisionInfo, relevantBoxes, elapsed);
		
			// Local variables to arrays for less typing
			let collisionsBuffer = playerCollisionInfo.collisionsBuffer;
			let minTime = playerCollisionInfo.minTime;
			let minIndex = playerCollisionInfo.minIndex;
		
			let maxStepHeight = playerBox.min[1] + stepHeight; 
			let resolvedX = minIndex[0] == -1, resolvedZ = minIndex[2] == -1;
		
			if (!resolvedX && !resolvedZ) {
				let fca = minTime[0] < minTime[2] ? 0 : 2; // First Collision Axis
		
				// Prioritise moving along the axis with the highest delta 
				// (for inanimate objects should prioritse move along first collision axis, however for a character intent is important)
				// (this allow us to slide into tight spaces more easily)
				let absDeltaZ = Math.abs(targetPosition[2] - playerPosition[0]);
				let absDeltaX = Math.abs(targetPosition[0] - playerPosition[0]);
				let pma = absDeltaZ < absDeltaX ? 0 : 2; // Primary movement axis
				let sma = absDeltaZ < absDeltaX ? 2 : 0; // Secondary movement axis
		
				if (!tryStep(fca, maxStepHeight, elapsed)) {
					// Try moving along pma first
					let targetPosCache = targetPosition[sma];
					targetPosition[sma] = getTouchPointTarget(collisionsBuffer[minIndex[sma]], playerBox, sma, targetPosition[sma] - playerPosition[sma]);
					
					checkForPlayerCollisions(playerCollisionInfo, relevantBoxes, elapsed);
					
					if (minIndex[pma] != -1) {
						// Still impacting on prioritised collision axis
						if (!tryStep(pma, maxStepHeight, elapsed)) {
							// Step did not resolve all collision
							// No more sliding along in prioritised collision axis
							targetPosition[pma] = getTouchPointTarget(collisionsBuffer[minIndex[pma]], playerBox, pma, targetPosition[pma] - playerPosition[pma]);
		
							// Try sliding the deprioritised collisation axis instead (with minimal movement in prioritised collision axis)
							targetPosition[sma] = targetPosCache;
							checkForPlayerCollisions(playerCollisionInfo, relevantBoxes, elapsed);
		
							if (minIndex[sma] != -1) {
								if (!tryStep(sma, maxStepHeight, elapsed)) {
									// No dice really in a corner
									targetPosition[sma] = getTouchPointTarget(collisionsBuffer[minIndex[sma]], playerBox, sma, targetPosition[sma] - playerPosition[sma]);
								}
							}
						}
					}
				}
		
			} else if (!resolvedX || !resolvedZ) {
				let fca = resolvedZ ? 0 : 2; // First Collision Axis
				let sca = resolvedZ ? 2 : 0; // Second Collision Axis (though there's no collision initially)
				
				if (!tryStep(fca, maxStepHeight, elapsed)) { 
					// Try step failed, move up to object instead
					targetPosition[fca] = getTouchPointTarget(collisionsBuffer[minIndex[fca]], playerBox, fca, targetPosition[fca] - playerPosition[fca]);
					checkForPlayerCollisions(playerCollisionInfo, relevantBoxes, elapsed);
					
					if (minIndex[sca] != -1) {
						// Oh no now that we're not moving in fca we're hitting something in sca
						targetPosition[sca] = getTouchPointTarget(collisionsBuffer[minIndex[sca]], playerBox, sca, targetPosition[sca] - playerPosition[sca]);
					}
				}
			} 
		
			// Finally move the player to the approved target position
			teleport(targetPosition);
			
			// Cache Velocity
			velocity[0] = (playerPosition[0] - lastPosition[0]) / elapsed;
			velocity[2] = (playerPosition[2] - lastPosition[2]) / elapsed;	
		};

		controller.moveY = (velocity, elapsed) => {
			vec3.copy(lastPosition, playerPosition);	
			vec3.scaleAndAdd(targetPosition, playerPosition, Maths.vec3Y, velocity[1] * elapsed);
			
			sweepForRevelantBoxes(relevantBoxes, vorld, world.boxes, playerBox, targetPosition, playerPosition, 0);

			let collision = checkForPlayerCollisionsY(playerCollisionInfo, relevantBoxes, elapsed) > 0;
		
			if (collision) {
				let closestBox = playerCollisionInfo.collisionsBuffer[playerCollisionInfo.minIndex[1]];
				if (velocity[1] <= 0) {
					// Moving down, move playerPosition so player is extents above closestBox.max[1]
					playerPosition[1] = closestBox.max[1] + playerBox.extents[1];
					playerBox.recalculateMinMax();
					velocity[1] = (playerPosition[1] - lastPosition[1]) / elapsed;
					return true; // Hit Ground
				} else {
					// Moving up, move playerPosition so player is extents below  closestBox.min[1]
					playerPosition[1] = closestBox.min[1] - playerBox.extents[1];
					playerBox.recalculateMinMax();
					velocity[1] = (playerPosition[1] - lastPosition[1]) / elapsed;
					return false; // TODO: Contact point top would be nice to differentitate from no collision
				}
			} else {
				playerPosition[1] = targetPosition[1];
				playerBox.recalculateMinMax();
				return false;
			}
		};

		return controller;
	};

	return exports;
})();