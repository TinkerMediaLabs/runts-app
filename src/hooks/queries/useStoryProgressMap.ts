import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getCurrentUser } from 'aws-amplify/auth';
import { findFinished, findInProgress } from '../../lib/userStoryLookups';

export type StoryProgressStatus = 'none' | 'in_progress' | 'completed';

export interface StoryProgressInfo {
  status: StoryProgressStatus;
  progressSeconds?: number;
}

// Per-story progress via two index lookups (byUserAndStory), cached under ['storyProgress', id].
// Cost depends on how many stories are on screen, not on how much the user has ever listened to.
async function fetchProgress(storyId: string): Promise<StoryProgressInfo> {
  const { userId } = await getCurrentUser();
  const [finished, inProgress] = await Promise.all([findFinished(userId, storyId), findInProgress(userId, storyId)]);
  // Finished takes priority if a story somehow has both records
  if (finished.length) return { status: 'completed' };
  if (inProgress.length) return { status: 'in_progress', progressSeconds: (inProgress[0] as any).progressSeconds ?? 0 };
  return { status: 'none' };
}

export function useStoryProgress(storyId: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ['storyProgress', storyId],
    queryFn: () => fetchProgress(storyId as string),
    enabled: !!storyId,
    staleTime: 1000 * 60 * 2,
  });
  return data;
}

// storyId -> progress info for the stories a screen shows. Shares cache entries with useStoryProgress.
export function useStoryProgressMap(storyIds: (string | null | undefined)[]) {
  const ids = useMemo(
    () => Array.from(new Set(storyIds.filter((id): id is string => !!id))),
    [storyIds.join(',')] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: ['storyProgress', id],
      queryFn: () => fetchProgress(id),
      staleTime: 1000 * 60 * 2,
    })),
  });
  return useMemo(() => {
    const m: Record<string, StoryProgressInfo> = {};
    results.forEach((r, i) => { if (r.data) m[ids[i]] = r.data; });
    return m;
  }, [results, ids]);
}
