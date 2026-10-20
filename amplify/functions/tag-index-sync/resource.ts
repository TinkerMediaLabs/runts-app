import { defineFunction } from '@aws-amplify/backend';
export const tagIndexSync = defineFunction({
  name: 'tag-index-sync',
  entry: './handler.ts',
  timeoutSeconds: 60,
  resourceGroupName: 'data',
});
