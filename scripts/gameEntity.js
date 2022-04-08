module.exports = (function(){
	let exports = {};

	exports.create = () => {
		let entity = {};

		// Arguably this is just an indexed map from fury
		// Worth noting this isn't really ECS although it might look similar
		// in ECS the entity is just an id, and the components get an id for 
		// the entity to which they apply, finding them is left to another 
		// system / set of queries on a global database rather than being OO
		entity.components = [];

		entity.addComponent = (name, component) => {
			entity[name] = component;
			entity.components.push(name);
		};

		entity.removeComponent = (name) => {
			let index = entity.components.indexOf(name);
			if (index >= 0) {
				entity.components.splice(index);
				delete entity[name];
			}
		};

		entity.update = (elapsed) => {
			for (let i = 0, l = entity.components.length; i < l; i++) {
				let component = entity[entity.components[i]];
				if (component && component.update) {
					component.update(elapsed);
				}
			}
		};

		return entity;
	};

	return exports;
})();