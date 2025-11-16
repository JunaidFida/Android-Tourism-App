const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for Mapbox database files
config.resolver.assetExts.push('db');

module.exports = config;