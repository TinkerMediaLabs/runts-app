import { defineFunction, secret } from '@aws-amplify/backend';

// Web address (function URL) the player library posts listening progress to while the app is closed in a car.
export const carProgress = defineFunction({
  name: 'car-progress',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 15,
  environment: { CAR_PASS_SECRET: secret('CAR_PASS_SECRET') },
});
