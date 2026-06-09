import { Amplify } from 'aws-amplify';
import Constants from 'expo-constants';

const env = Constants.expoConfig?.extra?.APP_ENV ?? 'development';

try {
  let config;
  switch (env) {
    case 'staging':
      config = require('../../amplify_outputs.staging.json'); break;
    case 'production':
      config = require('../../amplify_outputs.production.json'); break;
    default:
      config = require('../../amplify_outputs.json');
  }
  Amplify.configure(config);
} catch (e) {
  console.warn(`[Amplify] Could not load config for env: ${env}`);
}

// Kept for backward compatibility — now a no-op
export function configureAmplify() {}