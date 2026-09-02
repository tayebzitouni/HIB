const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro already handles ordinary images. These additions allow bundled GLTF,
// Draco, Meshopt, and Basis/KTX2 payloads to be resolved as binary assets.
for (const extension of ['glb', 'gltf', 'bin', 'drc', 'ktx2', 'basis', 'wasm']) {
  if (!config.resolver.assetExts.includes(extension)) {
    config.resolver.assetExts.push(extension);
  }
}

module.exports = config;
