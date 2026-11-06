import { defineFunction } from '@aws-amplify/backend';

// The only way to create or edit a comment. Takes the author from the sign-in, checks length, the word
// filter and a posting rate, and writes the comment itself (see handler.ts).
export const commentWrite = defineFunction({
  name: 'comment-write',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 10,
});
