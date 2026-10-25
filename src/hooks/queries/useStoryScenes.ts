import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getOfflineScenes } from '../../lib/offlineStorage';

export type StoryScene = {
  id: string;
  startSeconds: number;
  imageUri: string;
  altText: string;
  localUri?: string;   // on-device file when the story was downloaded for offline listening
};

// A story's picture-book scenes in time order. ONE indexed query (byStoryAndStart); the CMS caps a story
// at 60 scenes. Ordinary stories have sceneCount 0/undefined and never make this call.
export function useStoryScenes(storyId: string | null | undefined, sceneCount: number | null | undefined) {
  return useQuery({
    queryKey: ['storyScenes', storyId],
    queryFn: async (): Promise<StoryScene[]> => {
      const offline = await getOfflineScenes(storyId as string);
      const localByImage = new Map(offline.map(o => [o.imageUri, o.localPath]));
      try {
        const client = generateClient<Schema>();
        const res: any = await (client.models.StoryScene as any).listStorySceneByStoryIdAndStartSeconds(
          { storyId }, { sortDirection: 'ASC', limit: 100 });
        if (res.errors?.length) throw new Error(res.errors[0].message);
        return (res.data ?? []).map((r: any) => ({
          id: r.id, startSeconds: r.startSeconds, imageUri: r.imageUri, altText: r.altText ?? '',
          localUri: localByImage.get(r.imageUri),
        }));
      } catch (err) {
        // No connection: use the scenes saved with the download, if any.
        if (offline.length === 0) throw err;
        return offline.map((o, i) => ({
          id: `offline-${i}`, startSeconds: o.startSeconds, imageUri: o.imageUri, altText: o.altText, localUri: o.localPath,
        }));
      }
    },
    enabled: !!storyId && (sceneCount ?? 0) > 0,
    staleTime: 1000 * 60 * 30,
  });
}

export { sceneIndexAt } from '../../lib/sceneIndex';
