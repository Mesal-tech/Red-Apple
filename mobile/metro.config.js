const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro resolves node_modules including nested and scoped packages
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

config.resolver.extraNodeModules = {
  '@stream-io/react-native-webrtc': path.resolve(__dirname, 'node_modules/@stream-io/react-native-webrtc'),
  '@stream-io/video-react-native-sdk': path.resolve(__dirname, 'node_modules/@stream-io/video-react-native-sdk'),
  three: path.resolve(__dirname, 'node_modules/three'),
};

// Polyfill MessageQueue before InitializeCore runs in Bridgeless dev client
const defaultGetPolyfills = config.serializer.getPolyfills;
config.serializer.getPolyfills = (params) => {
  const polyfills = defaultGetPolyfills ? defaultGetPolyfills(params) : [];
  return [...polyfills, path.resolve(__dirname, 'src/utils/messageQueuePolyfill.js')];
};

const nativeWindConfig = withNativeWind(config, { input: './global.css' });
const nativeWindResolveRequest = nativeWindConfig.resolver.resolveRequest;

// Web bundles need React Native Web's DOM implementations (including
// unstable_createElement, used by react-native-svg) for every bare import of
// react-native. Native bundles continue to resolve React Native normally.
nativeWindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native') {
    return context.resolveRequest(context, 'react-native-web', platform);
  }

  // Preserve NativeWind's resolver, which compiles the global CSS input.
  if (nativeWindResolveRequest) {
    return nativeWindResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = nativeWindConfig;
