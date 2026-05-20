import { Amplify } from 'aws-amplify';
import Constants from 'expo-constants';

export function configureAmplify() {
  const env = Constants.expoConfig?.extra?.APP_ENV ?? 'development';

  let config;

  try {
    switch (env) {
      case 'staging':
        config = require('../../amplify_outputs.staging.json');
        break;
      case 'production':
        config = require('../../amplify_outputs.production.json');
        break;
      default:
        config = require('../../amplify_outputs.json');
    }
  } catch (e) {
    console.warn(`[Amplify] Could not load config for env: ${env}`);
    return;
  }

  Amplify.configure(config);
}