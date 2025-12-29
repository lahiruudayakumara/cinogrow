const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure that all platform extensions are included for better compatibility
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;