const APP_ENV = process.env.APP_ENV ?? "development";

const envConfig = {
  development: {
    name: "Runts-Dev",
    androidPackage: "com.runtsapp.myapp.dev",
    iosBundleId: "com.runtsapp.myapp.dev",
    icon: "./assets/images/icon.png",
  },
  staging: {
    name: "Runts-Stg",
    androidPackage: "com.runtsapp.myapp.staging",
    iosBundleId: "com.runtsapp.myapp.staging",
    icon: "./assets/images/icon.png",
  },
  production: {
    name: "Runts",
    androidPackage: "com.runtsapp.myapp",
    iosBundleId: "com.runtsapp.myapp",
    icon: "./assets/images/icon.png",
  },
};

const env = envConfig[APP_ENV];

export default ({ config }) => ({
  ...config,
  name: env.name,
  ios: {
    ...config.ios,
    bundleIdentifier: env.iosBundleId,
    // Universal Links — iOS intercepts tinkermedia.net/runts/* before opening browser
    associatedDomains: ["applinks:tinkermedia.net", "applinks:www.tinkermedia.net"],
  },
  android: {
    ...config.android,
    package: env.androidPackage,
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "www.tinkermedia.net",  // ← was tinkermedia.net
            pathPrefix: "/runts",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins: [
    "@sentry/react-native/expo"
  ],
  extra: {
    eas: {
      projectId: "e36ad826-5ed4-43b4-a440-e0b4590e6c63",
    },
    APP_ENV,
    sentryDsn: process.env.SENTRY_DSN,
    rudderWriteKey: process.env.EXPO_PUBLIC_RUDDER_WRITE_KEY,
    rudderDataPlane: process.env.EXPO_PUBLIC_RUDDER_DATA_PLANE,
  },
});