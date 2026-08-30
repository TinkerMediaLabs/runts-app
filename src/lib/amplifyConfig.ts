import { Amplify } from 'aws-amplify';
import Constants from 'expo-constants';

const env = Constants.expoConfig?.extra?.APP_ENV ?? 'development';
console.log('[Amplify] env:', env); // ← add

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
  console.log('[Amplify] user_pool_id:', config?.auth?.user_pool_id); // ← add
  Amplify.configure(config);
} catch (e) {
  console.warn(`[Amplify] Could not load config for env: ${env}`, e);
}

export function configureAmplify() {}