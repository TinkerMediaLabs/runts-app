import { defineFunction } from '@aws-amplify/backend';

export const incrementListens = defineFunction({
  name: 'increment-listens',
  entry: './handler.ts',
  resourceGroupName: 'data',  // ← assign to data stack, breaks the circular dep
});