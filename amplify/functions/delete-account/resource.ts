import { defineFunction, secret } from '@aws-amplify/backend';

export const deleteAccount = defineFunction({
  name: 'delete-account',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
  environment: { APPLE_PRIVATE_KEY_B64: secret('APPLE_PRIVATE_KEY_B64') },
});
