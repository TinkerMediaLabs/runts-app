import { defineFunction, secret } from '@aws-amplify/backend';

// The public page behind a shared story link (tinkermedia.net/runts/story/<id>): link-preview tags with the story's
// title, author and cover, plus an "Open in Runts" button. It has a public function URL; the website forwards
// /runts/story/* to it. The signing key (for the cover link) is the same Amplify secret audio-links uses.
export const sharePreview = defineFunction({
  name: 'share-preview',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 10,
  environment: { CLOUDFRONT_PRIVATE_KEY_B64: secret('CLOUDFRONT_PRIVATE_KEY_B64') },
});
