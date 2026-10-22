import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';
import { findInProgress } from '../../lib/userStoryLookups';
import { unwrap } from '@/lib/amplifyResult';

const IN_PROGRESS_PAGE = 20;

// ONE page of in-progress rows (newest listened first) + a Story get for just that page,
// filtered to erotic / non-erotic. Never reads the user's whole history.
async function fetchInProgressPage(erotic: boolean, token: string | null) {
  const client = generateClient<Schema>();
  const { userId } = await getCurrentUser();
  const res: any = await (client.models.UserInProgressStory as any).listUserInProgressStoryByUserIdAndLastListenedAt(
    { userId }, { sortDirection: 'DESC', limit: IN_PROGRESS_PAGE, nextToken: token ?? undefined });
  if (res.errors?.length) throw new Error(res.errors[0].message);
  const rows: any[] = res.data ?? [];
  const storyResults = await Promise.all(rows.map(r => client.models.Story.get({ id: r.storyId })));
  const items = rows.filter((_, i) => (storyResults[i]?.data?.isErotic === 'true') === erotic);
  return { items, nextToken: (res.nextToken ?? null) as string | null };
}

// First `limit` matching rows only (pages until enough are found; bounded).
async function fetchInProgressTop(erotic: boolean, limit: number) {
  const out: any[] = []; let token: string | null = null;
  for (let page = 0; page < 5 && out.length < limit; page++) {
    const r = await fetchInProgressPage(erotic, token);
    out.push(...r.items); token = r.nextToken;
    if (!token) break;
  }
  return out.slice(0, limit);
}

// Continue Listening strip - never shows erotic stories.
export function useInProgressStories(limit: number = 4) {
  return useQuery({ queryKey: ['inProgressStories', 'top', limit], queryFn: () => fetchInProgressTop(false, limit), staleTime: 1000 * 60 * 2 });
}
// Erotic Home strip only.
export function useEroticInProgressStories(limit: number = 10) {
  return useQuery({ queryKey: ['eroticInProgressStories', limit], queryFn: () => fetchInProgressTop(true, limit), staleTime: 1000 * 60 * 2 });
}
// Full "in progress" list screen: load more on scroll.
export function useInProgressStoriesPaginated() {
  return useInfiniteQuery({
    queryKey: ['inProgressStories', 'paged'],
    queryFn: ({ pageParam }: { pageParam: string | null }) => fetchInProgressPage(false, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextToken,
    staleTime: 1000 * 60 * 2,
  });
}

export async function upsertInProgressStory(storyId: string, progressSeconds: number) {
  const { userId } = await getCurrentUser();
  const client = generateClient<Schema>();
  const existing = await findInProgress(userId, storyId);
  if (existing.length) {
    unwrap(await client.models.UserInProgressStory.update({
      id: existing[0].id,
      progressSeconds: Math.floor(progressSeconds),
      lastListenedAt: new Date().toISOString(),
    }), 'Save progress');
  } else {
    unwrap(await client.models.UserInProgressStory.create({
      userId, storyId,
      progressSeconds: Math.floor(progressSeconds),
      lastListenedAt: new Date().toISOString(),
    }), 'Save progress');
  }
}

export function useDeleteInProgressStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      const existing = await findInProgress(userId, storyId);
      for (const row of existing) unwrap(await client.models.UserInProgressStory.delete({ id: row.id }), 'Remove from in-progress');
    },
    onSuccess: (_d, storyId) => {
      queryClient.invalidateQueries({ queryKey: ['storyProgress', storyId] });
      queryClient.invalidateQueries({ queryKey: ['inProgressStories'] });
      queryClient.invalidateQueries({ queryKey: ['eroticInProgressStories'] });
    },
  });
}

export async function getInProgressSeconds(storyId: string): Promise<number> {
  const { userId } = await getCurrentUser();
  const rows = await findInProgress(userId, storyId);
  return rows[0]?.progressSeconds ?? 0;
}
