import { defineFunction } from '@aws-amplify/backend';

export const deleteAccount = defineFunction({
  name: 'delete-account',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
