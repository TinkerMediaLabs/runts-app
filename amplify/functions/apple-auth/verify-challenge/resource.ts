import { defineFunction, secret } from '@aws-amplify/backend';

// Needs the Apple key to swap the one-time code for Apple's refresh token. Cognito waits at most 5 seconds for a trigger.
export const appleVerifyChallenge = defineFunction({
  name: 'apple-verify-challenge',
  entry: './handler.ts',
  resourceGroupName: 'auth',
  timeoutSeconds: 5,
  environment: {
    APPLE_BUNDLE_IDS: secret('APPLE_BUNDLE_IDS'),
    APPLE_PRIVATE_KEY_B64: secret('APPLE_PRIVATE_KEY_B64'),
  },
});
