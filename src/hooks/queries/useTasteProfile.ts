import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { isListened, topTags, listenedTagIds, type TasteEntry } from '../../lib/taste';

const RECENT = 20;          // newest finished + newest in-progress rows looked at: a fixed, small amount of work

export type TasteProfile = {
  learnedTagIds: string[];   // top genres from listening (not including the ones the listener picked)
  listenedIds: string[];     // recently finished / mostly played stories, so For You does not repeat them
  listenedTagIds?: string[]; // every genre those stories belong to (missing in profiles saved by older app versions)
};

export async function fetchTasteProfile(pickedTagIds: string[]): Promise<TasteProfile> {
  const client = generateClient<Schema>();
  const { userId } = await getCurrentUser();
  const safe = async (p: Promise<any>): Promise<any[]> => { try { return (await p)?.data ?? []; } catch { return []; } };

  const [finished, inProgress] = await Promise.all([
    safe((client.models.UserFinishedStory as any).listUserFinishedStoryByUserIdAndFinishedAt(
      { userId }, { sortDirection: 'DESC', limit: RECENT })),
    safe((client.models.UserInProgressStory as any).listUserInProgressStoryByUserIdAndLastListenedAt(
      { userId }, { sortDirection: 'DESC', limit: RECENT })),
  ]);

  const finishedIds = new Set<string>(finished.map((r: any) => r.storyId));
  const ids = Array.from(new Set<string>([...finishedIds, ...inProgress.map((r: any) => r.storyId)]));
  const stories = new Map<string, any>();
  await Promise.all(ids.map(async id => {
    try { const r = await client.models.Story.get({ id }); if (r.data) stories.set(id, r.data); } catch { /* skip */ }
  }));

  const entries: TasteEntry[] = [];
  const listenedIds: string[] = [];
  for (const r of finished) {
    const s = stories.get(r.storyId);
    if (!s) continue;
    listenedIds.push(s.id);
    entries.push({ primaryTagId: s.primaryTagId, secondaryTagId: s.secondaryTagId, isErotic: s.isErotic, weight: 1 });
  }
  for (const r of inProgress) {
    const s = stories.get(r.storyId);
    if (!s || finishedIds.has(s.id)) continue;
    if (!isListened(false, r.progressSeconds, s.duration)) continue;
    listenedIds.push(s.id);
    entries.push({ primaryTagId: s.primaryTagId, secondaryTagId: s.secondaryTagId, isErotic: s.isErotic, weight: 0.6 });
  }

  return { learnedTagIds: topTags(entries, new Set(pickedTagIds), 2), listenedIds, listenedTagIds: listenedTagIds(entries) };
}

// The listener's taste, refreshed every few hours. It only shapes For You, so a failure (offline) just
// means For You uses the picked genres alone.
export function useTasteProfile(pickedTagIds: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: ['taste', pickedTagIds.join(',')],
    queryFn: () => fetchTasteProfile(pickedTagIds),
    enabled,
    staleTime: 1000 * 60 * 60 * 3,
    retry: 1,
  });
}
