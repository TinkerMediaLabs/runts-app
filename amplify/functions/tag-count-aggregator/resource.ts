import { defineFunction } from '@aws-amplify/backend';
export const tagCountAggregator = defineFunction({
  name: 'tag-count-aggregator',
  entry: './handler.ts',
  resourceGroupName: 'data',
});
