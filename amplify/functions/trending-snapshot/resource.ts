import { defineFunction } from '@aws-amplify/backend';

export const trendingSnapshot = defineFunction({
  name: 'trending-snapshot',
  entry: './handler.ts',
  resourceGroupName: 'data',
  schedule: 'every 1h',
  timeoutSeconds: 120,
});
