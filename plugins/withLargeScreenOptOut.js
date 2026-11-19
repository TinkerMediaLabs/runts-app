// Android 16 (API 36) ignores the portrait lock and the "not resizable" setting on screens 600dp and wider, so on
// tablets, foldables and split-screen the app could rotate or resize while its layouts assume a phone. This opts the
// whole app out (Android shows it as a phone-shaped window instead). Android removes the opt-out for apps that
// target API 37 or higher, so the layouts need to become adaptive before the app moves to that target.
// https://developer.android.com/develop/adaptive-apps/guides/app-orientation-aspect-ratio-resizability
const { withAndroidManifest } = require('@expo/config-plugins');

const NAME = 'android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY';

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    app.property = app.property ?? [];
    if (!app.property.some((p) => p.$['android:name'] === NAME)) {
      app.property.push({ $: { 'android:name': NAME, 'android:value': 'true' } });
    }
    return cfg;
  });
