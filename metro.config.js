const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    babelTransformerPath: require.resolve(
      'react-native-svg-transformer/react-native',
    ),
  },
  resolver: {
    assetExts: assetExts.filter(extension => extension !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    // Keep local setup portable when Watchman is unavailable or restricted.
    // Metro's Node watcher is sufficient for the current application size.
    useWatchman: false,
  },
};

module.exports = mergeConfig(defaultConfig, config);
