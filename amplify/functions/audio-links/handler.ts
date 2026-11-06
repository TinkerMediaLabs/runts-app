import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { validatePaths, buildLinks } from './links';

// Any signed-in user can ask for links to story audio (the same access they have to the bucket today).
// Checking that a free user may not get a premium story's link is a later hardening step (needs RevenueCat).
export const handler = async (event: any): Promise<string> => {
  if (!event.identity?.sub) throw new Error('Not authorized');

  const domain = process.env.AUDIO_CDN_DOMAIN;
  const keyPairId = process.env.AUDIO_KEY_PAIR_ID;
  const keyB64 = process.env.CLOUDFRONT_PRIVATE_KEY_B64;
  if (!domain || !keyPairId || !keyB64) throw new Error('Audio links are not configured');

  const paths = validatePaths(event.arguments?.paths);
  const privateKey = Buffer.from(keyB64, 'base64').toString('utf8');

  return JSON.stringify(buildLinks({
    paths,
    domain,
    now: new Date(),
    sign: (url, expires) => getSignedUrl({ url, keyPairId, privateKey, dateLessThan: expires.toISOString() }),
  }));
};
