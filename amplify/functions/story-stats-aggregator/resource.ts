import { defineFunction } from '@aws-amplify/backend';
export const storyStatsAggregator = defineFunction({
  name: 'story-stats-aggregator',
  entry: './handler.ts',
  resourceGroupName: 'data',
});
