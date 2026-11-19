import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useApp } from '@/context/AppContext';
import { pickWorlds, visibleWorlds, type World } from '../../lib/worlds';

// Worlds are Tag rows of type 'universe', read from the byTypeAndName index (alphabetical, paged), never a scan.
const PREVIEW_POOL = 50;   // how many worlds the Discover preview looks at before picking its few
const PAGE = 20;

const FIELDS = ['id', 'name', 'nameLower', 'description', 'tileImageUri', 'heroImageUri', 'storyCount', 'isErotic'] as const;
const toWorld = (r: any): World => Object.fromEntries(FIELDS.map(f => [f, r?.[f] ?? null])) as unknown as World;

async function listWorlds(limit: number, nextToken?: string | null) {
  const client = generateClient<Schema>();
  const res: any = await (client.models.Tag as any).listTagByTagTypeAndNameLower(
    { tagType: 'universe' }, { limit, nextToken: nextToken ?? undefined });
  if (res.errors?.length) throw new Error(res.errors[0].message);
  return { items: ((res.data ?? []) as any[]).map(toWorld), nextToken: (res.nextToken ?? null) as string | null };
}

// The few worlds shown on Discover (the biggest first).
export function useWorldsPreview(count: number, enabled: boolean = true) {
  const { eroticEnabled } = useApp();
  return useQuery({
    queryKey: ['worlds', 'preview', !!eroticEnabled, count],
    queryFn: async () => pickWorlds((await listWorlds(PREVIEW_POOL)).items, !!eroticEnabled, count),
    enabled,
    staleTime: 1000 * 60 * 15,
  });
}

// All worlds for the Worlds page, a page at a time.
export function useAllWorlds() {
  const { eroticEnabled } = useApp();
  return useInfiniteQuery({
    queryKey: ['worlds', 'all', !!eroticEnabled],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const page = await listWorlds(PAGE, pageParam);
      return { items: visibleWorlds(page.items, !!eroticEnabled), nextToken: page.nextToken };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextToken,
    staleTime: 1000 * 60 * 15,
  });
}
