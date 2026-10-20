import { defineFunction } from '@aws-amplify/backend';
export const followCountAggregator = defineFunction({
  name: 'follow-count-aggregator',
  entry: './handler.ts',
  resourceGroupName: 'data',
});
