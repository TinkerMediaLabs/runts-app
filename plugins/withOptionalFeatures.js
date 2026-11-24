// Play Console treats hardware features the app implies (from its permissions and portrait lock) as REQUIRED, which hides
// the app from devices without them (Android Auto head units, desktops, some tablets). Neither is essential, so mark
// them optional.
const { withAndroidManifest } = require('@expo/config-plugins');

const OPTIONAL_FEATURES = ['android.hardware.screen.portrait', 'android.hardware.wifi'];

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-feature'] = manifest['uses-feature'] ?? [];
    for (const name of OPTIONAL_FEATURES) {
      const existing = manifest['uses-feature'].find((f) => f.$['android:name'] === name);
      if (existing) existing.$['android:required'] = 'false';
      else manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    return cfg;
  });
