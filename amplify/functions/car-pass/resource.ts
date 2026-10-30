import { defineFunction, secret } from '@aws-amplify/backend';

// Issues the signed "car pass" (30 days) the app hands to the player library for progress posts.
export const carPass = defineFunction({
  name: 'car-pass',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 10,
  environment: { CAR_PASS_SECRET: secret('CAR_PASS_SECRET') },
});
