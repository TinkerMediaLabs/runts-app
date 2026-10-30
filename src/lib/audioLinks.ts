import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { createAudioLinkCache, type FetchedLinks } from './audioLinkCache';

// The app's one source of signed CDN links for story audio (7 days each). Only story files are served this way;
// anything else (full web addresses, other folders) keeps using the old path.
let client: ReturnType<typeof generateClient<Schema>> | null = null;

async function fetchLinks(paths: string[]): Promise<FetchedLinks> {
  client = client ?? generateClient<Schema>();
  const { data, errors } = await client.mutations.getAudioLinks({ paths });
  if (errors?.length || !data) throw new Error(errors?.[0]?.message ?? 'Could not get audio links');
  return JSON.parse(data) as FetchedLinks;
}

export const audioLinks = createAudioLinkCache({ fetchLinks });

export const isCdnPath = (p: string) => p.startsWith('stories/');
