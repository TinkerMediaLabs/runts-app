import { defineFunction, secret } from '@aws-amplify/backend';

export const applePreSignUp = defineFunction({
  name: 'apple-pre-signup',
  entry: './handler.ts',
  resourceGroupName: 'auth',
  timeoutSeconds: 5,
  environment: { APPLE_BUNDLE_IDS: secret('APPLE_BUNDLE_IDS') },
});
