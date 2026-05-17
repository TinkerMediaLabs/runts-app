// const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// const config = getSentryExpoConfig(__dirname);

// module.exports = config;

const { getDefaultConfig } =
  require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
