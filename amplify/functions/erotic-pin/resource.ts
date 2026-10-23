import { defineFunction } from '@aws-amplify/backend';

export const eroticPin = defineFunction({
  name: 'erotic-pin',
  entry: './handler.ts',
  resourceGroupName: 'data',  // same reason as increment-listens: keeps the data stack from a circular dep
});
