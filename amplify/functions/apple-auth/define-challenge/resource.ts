import { defineFunction } from '@aws-amplify/backend';

export const appleDefineChallenge = defineFunction({
  name: 'apple-define-challenge',
  entry: './handler.ts',
  resourceGroupName: 'auth',
  timeoutSeconds: 5,
});
