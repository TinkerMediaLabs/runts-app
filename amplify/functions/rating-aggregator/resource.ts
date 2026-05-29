import { defineFunction } from '@aws-amplify/backend';

export const ratingAggregator = defineFunction({
  name: 'rating-aggregator',
  entry: './handler.ts',
  resourceGroupName: 'data',
});