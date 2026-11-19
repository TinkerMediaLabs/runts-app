import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Every tag on one story, as ids (one small read on the story's own index; the names come from the shared tag
// cache). Used where a card shows more than the primary and secondary tag.
export function useStoryTagIds(storyId: string | null | undefined) {
  return useQuery({
    enabled: !!storyId,
    queryKey: ['storyTagIds', storyId],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const res: any = await (client.models.StoryTag as any).listStoryTagByStoryId({ storyId }, { limit: 50 });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return ((res.data ?? []) as any[]).map(l => l.tagId as string).filter(Boolean);
    },
    staleTime: 1000 * 60 * 10,
  });
}
