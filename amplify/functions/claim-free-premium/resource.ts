import { defineFunction, secret } from '@aws-amplify/backend';

export const claimFreePremium = defineFunction({
  name: 'claim-free-premium',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 20,
  environment: { REVENUECAT_SECRET_KEY: secret('REVENUECAT_SECRET_KEY') },
});
