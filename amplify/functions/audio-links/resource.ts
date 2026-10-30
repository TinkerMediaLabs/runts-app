import { defineFunction, secret } from '@aws-amplify/backend';

// Hands the app long-lived (7 day) signed CloudFront links for story audio. The private signing key is an
// Amplify secret; the CDN address and key id are added in backend.ts.
export const audioLinks = defineFunction({
  name: 'audio-links',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 15,
  environment: { CLOUDFRONT_PRIVATE_KEY_B64: secret('CLOUDFRONT_PRIVATE_KEY_B64') },
});
