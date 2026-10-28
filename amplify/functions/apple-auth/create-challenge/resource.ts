import { defineFunction } from '@aws-amplify/backend';

export const appleCreateChallenge = defineFunction({
  name: 'apple-create-challenge',
  entry: './handler.ts',
  resourceGroupName: 'auth',
  timeoutSeconds: 5,
});
