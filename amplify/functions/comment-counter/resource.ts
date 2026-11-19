import { defineFunction } from '@aws-amplify/backend';

export const commentCounter = defineFunction({
  name: 'comment-counter',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 30,   // a stream batch can hold up to 100 records; the 3 second default could cut one short and force a retry
});