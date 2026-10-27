import { defineFunction } from '@aws-amplify/backend';

export const dataHealth = defineFunction({
  name: 'data-health',
  entry: './handler.ts',
  resourceGroupName: 'data',
  schedule: 'every 24h',
  timeoutSeconds: 900,
  memoryMB: 1024,
});
