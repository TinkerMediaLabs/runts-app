import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';
import { findFinished } from '../../lib/userStoryLookups';

// Index byUserAndFinishedAt, newest first, 20 per page (History screen loads more on scroll).
export function useFinishedStories() {
  return useInfiniteQuery({
    queryKey: ['finishedStories', 'paged'],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      const res: any = await (client.models.UserFinishedStory as any).listUserFinishedStoryByUserIdAndFinishedAt(
        { userId }, { sortDirection: 'DESC', limit: 20, nextToken: pageParam ?? undefined });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return { items: (res.data ?? []) as any[], nextToken: (res.nextToken ?? null) as string | null };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMarkFinished() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      const existing = await findFinished(userId, storyId);
      if (existing.length) return existing[0];
      const { data, errors } = await client.models.UserFinishedStory.create({
        userId, storyId, finishedAt: new Date().toISOString(),
      });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    onSuccess: (_d, storyId) => {
      queryClient.invalidateQueries({ queryKey: ['finishedStories'] });
      queryClient.invalidateQueries({ queryKey: ['storyProgress', storyId] });
    },
  });
}
