browserify ./vorld/generation/worker.js -o ./build/scripts/generator-worker.js
browserify ./vorld/meshing/worker.js -o ./build/scripts/mesher-worker.js
browserify ./vorld/lighting/worker.js -o ./build/scripts/lighting-worker.js
browserify ./scripts/client.js -o ./build/scripts/vorld-archipelago.js