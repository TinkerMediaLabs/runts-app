import { defineFunction } from '@aws-amplify/backend';
export const listensAggregator = defineFunction({
  name: 'listens-aggregator',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 60,
});
