import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient<Schema>();

// ─── Fetch finished stories for current user ──────────────────────────────
export function useFinishedStories() {
  return useQuery({
    queryKey: ['finishedStories'],
    queryFn: async () => {
      const { userId } = await getCurrentUser();
      const { data, errors } = await client.models.UserFinishedStory.list({
        filter: { userId: { eq: userId } },
      });
      if (errors) throw new Error(errors[0].message);
      return [...(data ?? [])].sort((a, b) =>
        new Date(b.finishedAt ?? 0).getTime() - new Date(a.finishedAt ?? 0).getTime()
      );
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Mark a story as finished ─────────────────────────────────────────────
export function useMarkFinished() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      const { userId } = await getCurrentUser();

      // Check if already finished
      const { data: existing } = await client.models.UserFinishedStory.list({
        filter: {
          and: [
            { userId: { eq: userId } },
            { storyId: { eq: storyId } },
          ],
        },
      });

      if (existing?.length) return existing[0];

      const { data, errors } = await client.models.UserFinishedStory.create({
        userId,
        storyId,
        finishedAt: new Date().toISOString(),
      });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishedStories'] });
    },
  });
}