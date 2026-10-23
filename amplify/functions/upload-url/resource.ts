import { defineFunction } from '@aws-amplify/backend';

export const uploadUrl = defineFunction({
  name: 'upload-url',
  entry: './handler.ts',
  resourceGroupName: 'data',
});
