const Fury = require('../fury/src/fury');
const { Input, Physics, Maths } = require('../fury/src/fury');
const { vec3, quat } = require('../fury/src/maths');
const CharacterController = require ('./characterController.js');

let Player = module.exports = (function(){
	let exports = {};
	let prototype = { };

	let mouseLookSpeed = 0.25;
	let acceleration = 50;
	let movementSpeed = 6;
	let stopSpeed = 1.5;
	let airMovementSpeed = 4;
	let airAcceleration = 10;
	let jumpDeltaV = 7.5;
	let coyoteTime = 0.1;
	let gravity = 2 * 9.8;

	let vec3ScaleXZ = (out, a, scale) => {
		let y = a[1];
		a[1] = 0;
		vec3.scale(out, a, scale);
		a[1] = out[1] = y;
	};

	exports.create = (parameters) => {
		let player = Object.create(prototype);

		if (parameters.position) {
			player.position = parameters.position;
		} else {
			player.position = vec3.create();
		}

		let size = parameters.size;
		if (!size) {
			size = vec3.fromValues(1,2,1);
		}
		
		// Reference link box center and player position, i.e. player position at center of box
		player.box = Physics.Box.create({ center: player.position, size: size });
		let stepHeight = 0.51;
		let characterController = CharacterController.create({
			world: parameters.world,
			vorld: parameters.vorld,
			playerPosition: player.position,
			playerBox: player.box,
			stepHeight: stepHeight
		});
		player.velocity = vec3.create();

		let camera = player.camera = parameters.camera;
		vec3.copy(camera.position, player.position);
		quat.fromEuler(camera.rotation, 0, 180, 0); // Set look for player forward

		let localX = vec3.create(), localZ = vec3.create();
		let contacts = vec3.create();

		// Input Variables
		let ry = 0, rx = 0;
		let inputVector = vec3.create();
		let attemptJump = false; 
		let verticalLookAngle = 0;
		let maxContactSpeedFactor = 1.5; // Just limiting it 1:1 feels bad
		let maxContactSpeed = [movementSpeed, 0, movementSpeed];

		let detectInput = (elapsed) => {
			// Calculate Local Axes
			vec3.transformQuat(localX, Maths.vec3X, camera.rotation);
			vec3.transformQuat(localZ, Maths.vec3Z, camera.rotation);
			// vec3.copy(localForward, localZ);	// Before 0ing out y component copy to forward
			localZ[1] = localX[1] = 0;
			vec3.normalize(localX, localX);
			vec3.normalize(localZ, localZ);

			ry = rx = 0;
			if (!Input.isPointerLocked() && Input.mouseDown(0)) {
				Input.requestPointerLock();
			}
			if (Input.isPointerLocked()) {
				ry -= mouseLookSpeed * elapsed * Input.MouseDelta[0];
				rx -= mouseLookSpeed * elapsed * Input.MouseDelta[1];
			}
			let inputZ = Input.getAxis("s", "w", 0.05, Maths.Ease.inQuad);
			let inputX = Input.getAxis("d", "a", 0.05, Maths.Ease.inQuad);
			if (inputX !== 0 && inputZ !== 0) {
				// Normalize input vector if moving in more than one direction
				inputX /= Math.SQRT2;
				inputZ /= Math.SQRT2;
				// TODO: Test inputVector.sqrMagnitude > 1 => normalize(inputVector)
				maxContactSpeed[0] = Math.min(movementSpeed, maxContactSpeed[2] = maxContactSpeedFactor * movementSpeed / Math.SQRT2);
			} else if (inputX !== 0) {
				maxContactSpeed[0] = Math.min(movementSpeed, Math.abs(localX[0]) * movementSpeed * maxContactSpeedFactor);
				maxContactSpeed[2] = Math.min(movementSpeed, Math.abs(localX[2]) * movementSpeed * maxContactSpeedFactor);
			} else if (inputZ !== 0) {
				maxContactSpeed[0] = Math.min(movementSpeed, Math.abs(localZ[0]) * movementSpeed * maxContactSpeedFactor);
				maxContactSpeed[2] = Math.min(movementSpeed, Math.abs(localZ[2]) * movementSpeed * maxContactSpeedFactor);
			}
			// Q: ^^ Does this work niavely or do we need to compensate for current movement direction?

			vec3.zero(inputVector);
			vec3.scaleAndAdd(inputVector, inputVector, localX, inputX);
			vec3.scaleAndAdd(inputVector, inputVector, localZ, inputZ);

			attemptJump = Input.keyDown("Space", true);
		};

		// Movement Variables
		let grounded = false, lastGroundedTime = 0, canCayote = true, lastJumpAttemptTime = 0;
		let cameraTargetPosition = vec3.create();

		let jump = () => {
			grounded = false;
			canCoyote = false;
			// Apply Jump Velocity!
			player.velocity[1] = jumpDeltaV;
		};

		// Potential Bug:
		// Without reducing step when not grounded if you jump whilst facing into a corner with 2 height blocks in front, adjacent blocks height one,
		// You reliably get a bigger jump than normal as the player steps up the double height voxel. 
		// This be the controller working as intended, but it would require a confluence of values which merits investigation

		// TODO: Replace use of Date.now() with Fury.Time or similar
		// Nigh on impossible to drop into a space of one voxel - as the passes are separated - and if you did you'd just step out
		player.update = (elapsed) => {
			detectInput(elapsed);

			// Directly rotate camera
			Maths.quatRotate(camera.rotation, camera.rotation, ry, Maths.vec3Y);
			let clampAngle = 0.5 * Math.PI - 10 * Math.PI/180;
			let lastVerticalLookAngle = verticalLookAngle;
			verticalLookAngle = Fury.Maths.clamp(verticalLookAngle + rx, -clampAngle, clampAngle);
			quat.rotateX(camera.rotation, camera.rotation, verticalLookAngle - lastVerticalLookAngle);

			// Calculate Movement
			if (grounded) {
				let vSqr = player.velocity[0] * player.velocity[0] + player.velocity[2] * player.velocity[2];
				let isSliding = vSqr > movementSpeed * movementSpeed + 0.001; // Fudge factor for double precision when scaling

				if (isSliding) {
					// Only deceleration
					if (Math.sign(player.velocity[0]) != Math.sign(inputVector[0])) {
						player.velocity[0] += acceleration * elapsed * inputVector[0];
					}
					if (Math.sign(player.velocity[2]) != Math.sign(inputVector[2])) {
						player.velocity[2] += acceleration * elapsed * inputVector[2];
					}
				} else {
					// Accelerate
					player.velocity[0] += acceleration * elapsed * inputVector[0];
					player.velocity[2] += acceleration * elapsed * inputVector[2];
				}
		
				let groundSpeed = Math.sqrt(player.velocity[0] * player.velocity[0] + player.velocity[2] * player.velocity[2]);
				let anyInput = !!vec3.squaredLength(inputVector);
				
				if (!isSliding && anyInput) {
					// Limit Free movement speed if necessary
					if (groundSpeed > movementSpeed) {
						vec3ScaleXZ(player.velocity, player.velocity, movementSpeed / groundSpeed);
					} 
					// If in contact - limit speed on axis, to clamp sliding velocity
					if (contacts[0] !== 0) {
						player.velocity[2] = Math.sign(player.velocity[2]) * Math.min(Math.abs(player.velocity[2]), maxContactSpeed[2]);
					}
					if (contacts[2] !== 0) {
						player.velocity[0] = Math.sign(player.velocity[0]) * Math.min(Math.abs(player.velocity[0]), maxContactSpeed[0]);
					}
				} else if (groundSpeed > 0 && (!anyInput || isSliding)) {
					// Apply slow down force
					// This tries to model someone at a run deciding to stop if in the 0 to max movement speed range
					// Greater than this they are considered sliding and a different formula is used.
		
					let slowFactor = 2.5;	// Compeltely arbitary factor
					if (isSliding) {
						// Velocities larger than 24 m/s at 60fps (for 60 / slowFactor) are negated immediately when speed reduction proportional to v^2
						// So for velocities higher than this speed reduction proportional to v. Rationale is controller is "sliding" rather than coming to a 
						// controlled stop
						slowFactor *= 2 / groundSpeed;
					}
					
					let deltaV = groundSpeed * groundSpeed * slowFactor * elapsed;
					if (deltaV > groundSpeed) { 
						console.log("Warning: Calculated 'friction' greater than speed");
					}
					deltaV = Math.min(groundSpeed, deltaV);
		
					if(groundSpeed <= stopSpeed) {
						// Stop below a certain speed if not trying to move
						vec3.zero(player.velocity);
					} else if (groundSpeed != 0) {
						// Apply deceleration
						vec3ScaleXZ(player.velocity, player.velocity, (groundSpeed - deltaV) / groundSpeed);
					} else {
						vec3.zero(player.velocity);
					}
				}
			} else {
				// Apply Drag
				// F(drag) = (1/2)pvvC(drag)A
				// p = density of fluid, v = velocity relative to fluid, C(drag) = drag co-efficient
				// https://www.engineeringtoolbox.com/drag-coefficient-d_627.html person ~= 1.0 - 1.3, cube is 0.8, rectangluar box is ~ 2.1
				// F = m dv/dt => dv = F dt / m
				// Q: Is the force you experience in 'hitting' water, entirely difference in F(drag) or is there surface tension to add?
				// dv = pvvC(d)A * dt / 2m (with A ~= 1 and C(d) ~= 1, p(air) = 1.225 (one atmosphere at 15 degrees C), p(water) = 997)
				// dv = (v*v*1.225*dt)/2m
		
				// TODO: Also do this in water with much bigger coefficent
		
				let airSpeed = vec3.length(player.velocity);
				let dragDv = (airSpeed * airSpeed * 1.225 * elapsed) / (2 * 100);	// Assumes air and mass of 100kg, drag coefficent of ~1 and surface area ~1 (it's probably less)
				// ^^ Technically surface area is different based on direction, so a more accurate model would break down vertical against others
		
				if (airSpeed < dragDv) {
					// This happens when elasped > 200 / 1.225 * airSpeed * airSpeed 
					// i.e. air speed > sqrt(200 * 60 / 1.225) ~= 99 m/s
					console.log("Warning: Calculated drag higher than air speed!");
					airSpeed = Math.max(0, airSpeed - dragDv);
				}

				// Update Air Velocity
				if (airSpeed !== 0) {
					vec3.scale(player.velocity, player.velocity, (airSpeed - dragDv) / airSpeed);
				} else {
					vec3.zero(player.velocity);
				}	
				
				let targetX = player.velocity[0] + airAcceleration * elapsed * inputVector[0];
				let targetZ = player.velocity[2] + airAcceleration * elapsed * inputVector[2];

				let canAccelerate = targetX * targetX + targetZ * targetZ < airMovementSpeed * airMovementSpeed;
				if (canAccelerate || Math.abs(targetX) < Math.abs(player.velocity[0])) {
					player.velocity[0] = targetX;
				}
				if (canAccelerate || Math.abs(targetZ) < Math.abs(player.velocity[2])) {
					player.velocity[2] = targetZ;
				}
			}

			// Move Character By Velocity
			characterController.stepHeight = grounded ? stepHeight : 0; // No stepping whilst not grounded
			characterController.moveXZ(contacts, player.velocity, elapsed, inputVector);

			// Now Gravity / Jumping
			player.velocity[1] -= gravity * elapsed;

			if (attemptJump) {
				if (grounded || canCoyote && (Date.now() - lastGroundedTime < 1000 * coyoteTime)) {
					jump();
				} else {
					lastJumpAttemptTime = Date.now();
				}
			}

			// Y Move - contacts[1] will be -1 if touches ground
			characterController.moveY(contacts, player.velocity, elapsed)
			if (contacts[1] == -1) {
				lastGroundedTime = Date.now();
				if (!grounded && lastGroundedTime - lastJumpAttemptTime < 1000 * coyoteTime) {
					jump();
				} else {
					grounded = true;
					canCoyote = true;
				}
			} else {
				if (grounded && player.velocity[1] < 0) {
					grounded = false;
				}
			}

			// Smoothly move the camera - no jerks from sudden movement please!
			// Technically displacement isn't the issue, it's acceleration
			// Arguably the change due to falling if there is any, we should just do,
			// as that should always be smooth
			vec3.copy(cameraTargetPosition, player.position);
			vec3.scaleAndAdd(cameraTargetPosition, cameraTargetPosition, Maths.vec3Y, 0.75);	// 0.5 offset
			if (vec3.squaredLength(cameraTargetPosition) < 0.1) {
				vec3.copy(camera.position, cameraTargetPosition);
			} else {
				vec3.lerp(camera.position, camera.position, cameraTargetPosition, 0.25);
			}
		};

		return player;
	};

	return exports;
})();