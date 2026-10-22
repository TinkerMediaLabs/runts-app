import { defineFunction } from '@aws-amplify/backend';
export const userCleanup = defineFunction({
  name: 'user-cleanup',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 900,
});
