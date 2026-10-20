import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Newest live erotic stories (bounded). Reads the byEroticAndPublishedAt index (partition isErotic='true',
// newest first) and keeps only live ones, stopping once `limit` are collected - never the whole catalog.
// The Erotic home derives "New", "For You" and "Trending" (by listens) from this recent window.
const PAGE = 50;
const MAX_PAGES = 5;

export function useEroticStories(limit: number = 50) {
  return useQuery({
    queryKey: ['eroticStories', limit],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const out: any[] = [];
      let token: string | null = null;
      for (let page = 0; page < MAX_PAGES && out.length < limit; page++) {
        const res: any = await (client.models.Story as any).listStoryByIsEroticAndPublishedAt(
          { isErotic: 'true' },
          { sortDirection: 'DESC', limit: PAGE, nextToken: token ?? undefined }
        );
        if (res.errors?.length) throw new Error(res.errors[0].message);
        out.push(...(res.data ?? []).filter((s: any) => s.live === 'true'));
        token = res.nextToken ?? null;
        if (!token) break;
      }
      return out.slice(0, limit);
    },
    staleTime: 1000 * 60 * 5,
  });
}
