const { Bounds } = require('fury');

module.exports = (function() {
	let exports = {};
	exports.create = (bounds, onEnter, onExit) => {
		let triggerZone = {};
		triggerZone.active = true;
		triggerZone.isPlayerInZone = false;
		triggerZone.bounds = bounds;
		triggerZone.update = (player) => {
			if (triggerZone.active) {
				let containsPlayer = Bounds.contains(player.position, triggerZone.bounds);
				if (!triggerZone.isPlayerInZone && containsPlayer) {
					triggerZone.isPlayerInZone = true;
					if (onEnter) onEnter();
				}
				if (triggerZone.isPlayerInZone && !containsPlayer) {
					triggerZone.isPlayerInZone = false;
					if (onExit) onExit();
				}
			}
		};
		return triggerZone;
	};
	return exports;
})();