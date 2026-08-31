const APP_ENV = process.env.APP_ENV ?? 'development';

const envConfig = {
  development: {
    name:           'Runts-Dev',
    androidPackage: 'com.runtsapp.myapp.dev',
    iosBundleId:    'com.runtsapp.myapp.dev',
    icon:           './assets/images/icon.png',
    scheme:         'runts-dev',
  },
  staging: {
    name:           'Runts-Stg',
    androidPackage: 'com.runtsapp.myapp.staging',
    iosBundleId:    'com.runtsapp.myapp.staging',
    icon:           './assets/images/icon.png',
    scheme:         'runts-staging',
  },
  production: {
    name:           'Runts',
    androidPackage: 'com.runtsapp.myapp',
    iosBundleId:    'com.runtsapp.myapp',
    icon:           './assets/images/icon.png',
    scheme:         'runts',
  },
};

const env = envConfig[APP_ENV] ?? envConfig.development;

export default ({ config }) => ({
  ...config,
  name: env.name,
  scheme: env.scheme,
  newArchEnabled: true,

   splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },

  ios: {
    ...config.ios,
    bundleIdentifier: env.iosBundleId,
    // Universal Links — iOS intercepts tinkermedia.net/runts/* before opening browser
    associatedDomains: ['applinks:tinkermedia.net', 'applinks:www.tinkermedia.net'],
  },

  android: {
    ...config.android,
    package: env.androidPackage,
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action:     'VIEW',
        autoVerify: true,
        data: [
          {
            scheme:     'https',
            host:       'www.tinkermedia.net',
            pathPrefix: '/runts',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },

  // Spread plugins from app.json first, then add build-time plugins
plugins: [
    ...(config.plugins ?? []),
    '@sentry/react-native/expo',
    [
        'expo-build-properties',
        {
            ios: { deploymentTarget: '16.0' },
            android: {
              kotlinVersion: '1.9.24',
          },
        },
    ],
    [
        'expo-notifications',
        {
            icon: './assets/images/icon72w.png',
            color: '#000000',
        },
    ],
    [
        'react-native-google-mobile-ads',
        {
            androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
            iosAppId:     process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
        },
    ],
],

  extra: {
    eas: {
      projectId: 'e36ad826-5ed4-43b4-a440-e0b4590e6c63',
    },
    APP_ENV,
    sentryDsn:       process.env.SENTRY_DSN,
    rudderWriteKey:  process.env.EXPO_PUBLIC_RUDDER_WRITE_KEY,
    rudderDataPlane: process.env.EXPO_PUBLIC_RUDDER_DATA_PLANE,
    rcIosKey:        process.env.EXPO_PUBLIC_RC_IOS_KEY,      
    rcAndroidKey:    process.env.EXPO_PUBLIC_RC_ANDROID_KEY, 
    admobAndroidAppId:      process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
    admobIosAppId:          process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
    admobAndroidInterstitial: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL,
    admobIosInterstitial:   process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL,  
  },
});