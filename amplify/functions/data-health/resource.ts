import { defineFunction } from '@aws-amplify/backend';

export const dataHealth = defineFunction({
  name: 'data-health',
  entry: './handler.ts',
  resourceGroupName: 'data',
  schedule: 'every day',
  timeoutSeconds: 900,
  memoryMB: 1024,
});
