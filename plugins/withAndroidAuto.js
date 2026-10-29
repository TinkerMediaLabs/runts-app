// Declares Runts as a media app for Android Auto. Android Auto only lists apps that carry this declaration:
//  1. res/xml/automotive_app_desc.xml  ->  <uses name="media" />
//  2. an <application> meta-data entry pointing at that file.
// The player library already provides the media service the car talks to.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');

const META_NAME = 'com.google.android.gms.car.application';
const DESC = `<?xml version="1.0" encoding="utf-8"?>
<automotiveApp>
    <uses name="media" />
</automotiveApp>
`;

const withDescriptor = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'automotive_app_desc.xml'), DESC);
      return cfg;
    },
  ]);

const withMetaData = (config) =>
  withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    app['meta-data'] = app['meta-data'] ?? [];
    const exists = app['meta-data'].some((m) => m.$['android:name'] === META_NAME);
    if (!exists) {
      app['meta-data'].push({
        $: { 'android:name': META_NAME, 'android:resource': '@xml/automotive_app_desc' },
      });
    }
    return cfg;
  });

module.exports = (config) => withMetaData(withDescriptor(config));
