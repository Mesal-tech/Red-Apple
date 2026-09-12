const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro resolves node_modules including nested and scoped packages
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

config.resolver.extraNodeModules = {
  '@stream-io/react-native-webrtc': path.resolve(__dirname, 'node_modules/@stream-io/react-native-webrtc'),
  '@stream-io/video-react-native-sdk': path.resolve(__dirname, 'node_modules/@stream-io/video-react-native-sdk'),
};

// Polyfill MessageQueue before InitializeCore runs in Bridgeless dev client
const defaultGetPolyfills = config.serializer.getPolyfills;
config.serializer.getPolyfills = (params) => {
  const polyfills = defaultGetPolyfills ? defaultGetPolyfills(params) : [];
  return [...polyfills, path.resolve(__dirname, 'src/utils/messageQueuePolyfill.js')];
};

module.exports = config;
