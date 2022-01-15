const { Input, Maths } = require('fury');
const vec3 = Maths.vec3;
const quat = Maths.quat;

let FreeFlyCamera = module.exports = (function(){
	let exports = {};

	// https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles
	let getRoll = function(q) {
		// Note: glMatrix is x,y,z,w where as wiki assumes w,x,y,z!
		let sinr_cosp = 2 * (q[3] * q[0] + q[1] * q[2]);
		let cosr_cosp = 1 - 2 * (q[0] * q[0] + q[1] * q[1]);
		return Math.atan(sinr_cosp / cosr_cosp);
		// If you want to know sector you need atan2(sinr_cosp, cosr_cosp)
		// but we don't in this case.
	};

	exports.create = (config) => {
		let rotateRate = config.rotateRate * Math.PI;
		let moveSpeed = config.moveSpeed;

		let camera = config.camera;

		let localx = vec3.create();
		let localy = vec3.create();
		let localz = vec3.create();

		let freeFlyCamera = {};
		freeFlyCamera.localX = localx;
		freeFlyCamera.localY = localy;
		freeFlyCamera.localZ = localz;

		freeFlyCamera.update = (elapsed) => {
			let q = camera.rotation;
			let p = camera.position;
			Maths.quatLocalAxes(q, localx, localy, localz);
			
			if (Input.mouseDown(2)) {
				let xRotation = Input.MouseDelta[0] * rotateRate*elapsed;
				let yRotation = Input.MouseDelta[1] * rotateRate*elapsed;
				Maths.quatRotate(q, q, -xRotation, Maths.vec3Y);
		
				let roll = getRoll(q);
				let clampAngle = 10 * Math.PI/180;
				if (Math.sign(roll) == Math.sign(yRotation) || Math.abs(roll - yRotation) < 0.5*Math.PI - clampAngle) {
					quat.rotateX(q, q, -yRotation);
				}
			}
		
			if (Input.keyDown("w")) {
				vec3.scaleAndAdd(p, p, localz, -moveSpeed*elapsed);
			}
			if (Input.keyDown("s")) {
				vec3.scaleAndAdd(p, p, localz, moveSpeed*elapsed);
			}
			if (Input.keyDown("a")) {
				vec3.scaleAndAdd(p, p, localx, -moveSpeed*elapsed);
			}
			if (Input.keyDown("d")) {
				vec3.scaleAndAdd(p, p, localx, moveSpeed*elapsed);
			}
			if (Input.keyDown("q")) {
				vec3.scaleAndAdd(p, p, localy, -moveSpeed*elapsed);
			}
			if (Input.keyDown("e")) {
				vec3.scaleAndAdd(p, p, localy, moveSpeed*elapsed);
			}
		};

		return freeFlyCamera;
	};

	return exports;
})();