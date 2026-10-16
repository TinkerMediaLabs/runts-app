import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';
import { fetchAllPages } from '../../lib/paginate';
import { findInProgress } from '../../lib/userStoryLookups';

async function fetchInProgressWithErotic(erotic: boolean) {
  const client = generateClient<Schema>();
  const { userId } = await getCurrentUser();
  // Index byUserAndLastListened, newest first, paginated.
  const rows = await fetchAllPages<any>(token =>
    client.models.UserInProgressStory.listUserInProgressStoryByUserIdAndLastListenedAt(
      { userId }, { sortDirection: 'DESC', limit: 100, nextToken: token }) as any);
  const storyResults = await Promise.all(rows.map(r => client.models.Story.get({ id: r.storyId })));
  return rows.filter((_, i) => (storyResults[i]?.data?.isErotic === 'true') === erotic);
}

// Main Continue Listening — never shows erotic stories.
export function useInProgressStories() {
  return useQuery({ queryKey: ['inProgressStories'], queryFn: () => fetchInProgressWithErotic(false), staleTime: 1000 * 60 * 2 });
}
// Erotic Home only.
export function useEroticInProgressStories() {
  return useQuery({ queryKey: ['eroticInProgressStories'], queryFn: () => fetchInProgressWithErotic(true), staleTime: 1000 * 60 * 2 });
}

export async function upsertInProgressStory(storyId: string, progressSeconds: number) {
  const { userId } = await getCurrentUser();
  const client = generateClient<Schema>();
  const existing = await findInProgress(userId, storyId);
  if (existing.length) {
    await client.models.UserInProgressStory.update({
      id: existing[0].id,
      progressSeconds: Math.floor(progressSeconds),
      lastListenedAt: new Date().toISOString(),
    });
  } else {
    await client.models.UserInProgressStory.create({
      userId, storyId,
      progressSeconds: Math.floor(progressSeconds),
      lastListenedAt: new Date().toISOString(),
    });
  }
}

export function useDeleteInProgressStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      const existing = await findInProgress(userId, storyId);
      for (const row of existing) await client.models.UserInProgressStory.delete({ id: row.id });
    },
    onSuccess: () => {
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
