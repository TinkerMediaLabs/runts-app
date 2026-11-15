import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import {
  buildLadder, bandsForLengths, mergeLinks, rankCandidates, unique, PAGE, MIN_MATCHES,
  type Choice, type PickerLength, type LinkRow,
} from '../../lib/moodPicks';
import { fetchTagInsight } from './useTagHome';

// "Picked for today" stories for a mood / genre / length choice. Every step is a small indexed query:
// per (tag, band) one page of the newest live stories, one trending read per chosen mood, then full story rows only for
// the dozen or so shown. At most 3 tags x 6 bands + 3 + ~20 reads however big the catalog is. The fallback ladder runs
// only as far as needed (it stops at the first step that finds enough stories).
export type PickedResult = { stories: any[]; level: number };

export function usePickedForToday(
  choice: Choice | null,
  lengths: PickerLength[],
  listenedIds: string[],
  limit: number = 10,
  ready: boolean = true,
) {
  const key = choice ? [choice.moodIds.join(','), choice.genreIds.join(','), choice.lengthKeys.join(',')].join('|') : 'none';
  return useQuery<PickedResult>({
    queryKey: ['stories', 'pickedToday', key, limit, listenedIds.length, lengths.length],
    enabled: !!choice && ready,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const client = generateClient<Schema>();
      const safe = async (p: Promise<any>): Promise<any[]> => { try { return (await p)?.data ?? []; } catch { return []; } };
      const listened = new Set(listenedIds);
      const bands = bandsForLengths(lengths, choice!.lengthKeys);

      // Stories trending in a chosen mood rank a little higher among equal matches.
      const trending = new Set<string>();
      await Promise.all(choice!.moodIds.map(async id => {
        try { (await fetchTagInsight(id))?.trendingIds.forEach(s => trending.add(s)); } catch { /* optional */ }
      }));

      const loadStories = async (ids: string[]) => {
        const got = await Promise.all(ids.map(async id => {
          try { return (await client.models.Story.get({ id })).data; } catch { return null; }
        }));
        return got.filter((s: any) => s && s.live === 'true' && s.isErotic !== 'true') as any[];
      };

      let best: PickedResult = { stories: [], level: 0 };
      for (const step of buildLadder(choice!)) {
        const useBands = step.useLength && bands.length > 0;
        const queries: Promise<any[]>[] = [];
        for (const tagId of step.tagIds) {
          if (useBands) {
            for (const band of bands) {
              queries.push(safe((client.models.StoryTag as any).listStoryTagByLiveTagBandAndPublishedAt(
                { liveTagBand: `${tagId}#${band}` }, { sortDirection: 'DESC', limit: PAGE })));
            }
          } else {
            queries.push(safe((client.models.StoryTag as any).listStoryTagByLiveTagIdAndPublishedAt(
              { liveTagId: tagId }, { sortDirection: 'DESC', limit: PAGE })));
          }
        }
        const rows = (await Promise.all(queries)).flat() as LinkRow[];
        const ranked = rankCandidates(mergeLinks(rows), trending, listened);
        // A few spare, since erotic and no-longer-live stories are dropped after the read.
        const stories = (await loadStories(ranked.slice(0, limit + 6))).slice(0, limit);
        best = { stories, level: step.level };
        if (stories.length >= MIN_MATCHES) break;
      }
      return { stories: unique(best.stories), level: best.level };
    },
  });
}
