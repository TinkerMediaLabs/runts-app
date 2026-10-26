import { defineFunction } from '@aws-amplify/backend';

export const tagInsights = defineFunction({
  name: 'tag-insights',
  entry: './handler.ts',
  resourceGroupName: 'data',
  schedule: 'every 3h',
  timeoutSeconds: 600,
  memoryMB: 1024,
});
