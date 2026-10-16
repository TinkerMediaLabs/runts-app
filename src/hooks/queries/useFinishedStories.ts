import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';
import { fetchAllPages } from '../../lib/paginate';
import { findFinished } from '../../lib/userStoryLookups';

// Index byUserAndFinishedAt, newest first, fully paginated.
// NOTE: a user's finished list is bounded per user (not per table), but it can still
// reach 1000s — if a screen renders this directly, switch it to load-more paging.
export function useFinishedStories() {
  return useQuery({
    queryKey: ['finishedStories'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      return fetchAllPages<any>(token =>
        client.models.UserFinishedStory.listUserFinishedStoryByUserIdAndFinishedAt(
          { userId }, { sortDirection: 'DESC', limit: 100, nextToken: token }) as any);
    },
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finishedStories'] }),
  });
}
