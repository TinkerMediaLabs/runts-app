module.exports = function(api) {
  // Cache per NODE_ENV so release bundles get a different config than dev.
  const isProd = api.cache.using(() => process.env.NODE_ENV === 'production');

  const plugins = [];
  // Strip console.log/info/debug from release builds; keep error and warn
  // (Sentry breadcrumbs and real problems still surface).
  if (isProd) plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  // Reanimated's plugin must stay last.
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
