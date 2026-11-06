import { defineAuth, secret } from '@aws-amplify/backend';
import { applePreSignUp } from '../functions/apple-auth/pre-signup/resource';
import { appleDefineChallenge } from '../functions/apple-auth/define-challenge/resource';
import { appleCreateChallenge } from '../functions/apple-auth/create-challenge/resource';
import { appleVerifyChallenge } from '../functions/apple-auth/verify-challenge/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: 'email',
          emailVerified: 'email_verified',
        },
      },
      // One list for every environment's pool: each build (production, dev, staging) returns to its own app scheme.
      callbackUrls: ['runts://callback', 'runts-dev://callback', 'runts-staging://callback'],
      logoutUrls: ['runts://signout', 'runts-dev://signout', 'runts-staging://signout'],
    },
  },
  // Native Sign in with Apple on iOS (see amplify/functions/apple-auth). Email and Google sign-in are unaffected.
  triggers: {
    preSignUp: applePreSignUp,
    defineAuthChallenge: appleDefineChallenge,
    createAuthChallenge: appleCreateChallenge,
    verifyAuthChallengeResponse: appleVerifyChallenge,
  },
});
