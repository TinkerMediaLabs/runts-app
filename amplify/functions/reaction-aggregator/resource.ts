import { defineFunction } from '@aws-amplify/backend';

export const reactionAggregator = defineFunction({
  name: 'reaction-aggregator',
  entry: './handler.ts',
  resourceGroupName: 'data',
});