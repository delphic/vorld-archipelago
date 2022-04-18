browserify ./vorld/scripts/generation/worker.js -o ./build/scripts/generator-worker.js
browserify ./vorld/scripts/meshing/worker.js -o ./build/scripts/mesher-worker.js
browserify ./vorld/scripts/lighting/worker.js -o ./build/scripts/lighting-worker.js
browserify ./scripts/client.js -o ./build/scripts/vorld-archipelago.js