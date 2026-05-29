import { defineFunction } from '@aws-amplify/backend';

export const commentCounter = defineFunction({
  name: 'comment-counter',
  entry: './handler.ts',
  resourceGroupName: 'data',
});