const Fury = require("fury");

module.exports = (function(){
	let exports = {};

	let cubeWireframeJson = {
		positions: [
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
		positions: [ -0.5, -0.5, 0.0, 0.5, -0.5, 0.0, 0.5, 0.5, 0.0, -0.5, 0.5, 0.0 ],
		normals: [ 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0 ],
		uvs: [ 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0 ],
		indices: [ 0, 1, 2, 0, 2, 3 ]
	};

	// Use Vorld.Primitives for textured cubiod mesh

	exports.createCubeWireframeMesh = () => {
		return Fury.Mesh.create(cubeWireframeJson);
	};

	exports.createQuadMesh = (tileIndex) => {
		let mesh = Fury.Mesh.create(quadJson);
		// Manually create tile buffers
		if (tileIndex !== undefined) {
			mesh.tileBuffer = Fury.Renderer.createBuffer([ tileIndex, tileIndex, tileIndex, tileIndex ], 1);
		}
		return mesh;
	};

	exports.appendTileIndices = (json, tileIndex) => {
		let vertexCount = Math.floor(json.positions.length / 3);
		json.tileIndices = [];
		for (let i = 0; i < vertexCount; i++) {
			json.tileIndices[i] = tileIndex;
		}
		if (!json.customAttributes) {
			json.customAttributes = [];
		}
		json.customAttributes.push({ name: "tileBuffer", source: "tileIndices", size: 1 });
	};

	exports.appendLightBake = (json, lightLevel, sunlightLevel) => {
		let vertexCount = Math.floor(json.positions.length / 3);
		json.lightBake = [];
		for (let i = 0; i < vertexCount; i++) {
			json.lightBake[i] = lightLevel + (sunlightLevel/16);
		}
		if (!json.customAttributes) {
			json.customAttributes = [];
		}
		json.customAttributes.push({ name: "lightBuffer", source: "lightBake", size: 1 });
	};

	return exports;
})();