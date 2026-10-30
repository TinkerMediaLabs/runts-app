import { Amplify } from 'aws-amplify';
import Constants from 'expo-constants';

const env = Constants.expoConfig?.extra?.APP_ENV ?? 'development';
console.log('[Amplify] env:', env); // ← add

// Identifies which backend this build talks to (its API URL). The saved data copy is tagged with it so
// data from another environment, or an older backend, is never shown.
export let BACKEND_ID = 'unknown';
// Where the player library posts progress while a story plays from the car with the app closed (Android).
export let CAR_PROGRESS_URL = '';

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
  BACKEND_ID = config?.data?.url ?? 'unknown';
  CAR_PROGRESS_URL = config?.custom?.carProgressUrl ?? '';
  // Return from the browser sign-in to this build's own app scheme (runts, runts-dev or runts-staging).
  const scheme = Constants.expoConfig?.scheme;
  const appScheme = Array.isArray(scheme) ? scheme[0] : scheme;
  if (appScheme && config?.auth?.oauth) {
    config = {
      ...config,
      auth: {
        ...config.auth,
        oauth: {
          ...config.auth.oauth,
          redirect_sign_in_uri: [`${appScheme}://callback`],
          redirect_sign_out_uri: [`${appScheme}://signout`],
        },
      },
    };
  }
  Amplify.configure(config);
} catch (e) {
  console.warn(`[Amplify] Could not load config for env: ${env}`, e);
}

export function configureAmplify() {}