import { Amplify } from 'aws-amplify';
import Constants from 'expo-constants';

import devConfig from '../../amplify_outputs.json';

const configs: Record<string, any> = {
  development: devConfig,
  staging: devConfig,
  production: devConfig,
};

export function configureAmplify() {
  const env = Constants.expoConfig?.extra?.APP_ENV ?? 'development';
  Amplify.configure(configs[env]);
}
