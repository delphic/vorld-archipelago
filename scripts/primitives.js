const Fury = require("../fury/src/fury");

module.exports = (function(){
	let exports = {};

	let cubeWireframeJson = {
		vertices: [
			0.0, 0.0, 0.0,
			0.0, 1.0, 0.0,
			1.0, 1.0, 0.0,
			1.0, 0.0, 0.0,
			0.0, 0.0, 1.0,
			0.0, 1.0, 1.0,
			1.0, 1.0, 1.0,
			1.0, 0.0, 1.0,
		],
		indices: [ 0, 1, 1, 2, 2, 3, 3, 0, 0, 4, 1, 5, 2, 6, 3, 7, 4, 5, 5, 6, 6, 7, 7, 4 ]
	};

	let quadJson = {
		vertices: [ -0.5, -0.5, 0.0, 0.5, -0.5, 0.0, 0.5, 0.5, 0.0, -0.5, 0.5, 0.0 ],
		normals: [ 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0 ],
		textureCoordinates: [ 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0 ],
		indices: [ 0, 1, 2, 0, 2, 3 ]
	};

	// Use Vorld.Primitives for textured cubiod mesh

	exports.createCubeWireframeMesh = () => {
		return Fury.Mesh.create(cubeWireframeJson);
	};

	exports.createQuadMesh = (tileIndex) => {
		let mesh = Fury.Mesh.create(quadJson);
		// HACK: create other buffers
		// TODO: make this just be normal quad without having to do all the voxel stuff
		if (tileIndex !== undefined) {
			mesh.tileBuffer = Fury.Renderer.createBuffer([ tileIndex, tileIndex, tileIndex, tileIndex ], 1);
		}
		// TODO: should query current blocks light level rather than building own buffer
		mesh.lightBuffer = Fury.Renderer.createBuffer([ 15/16, 15/16, 15/16, 15/16 ], 1); 
		return mesh;
	};

	return exports;
})();