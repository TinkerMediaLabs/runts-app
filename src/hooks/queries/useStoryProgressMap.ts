import { useMemo } from 'react';
import { useInProgressStories } from './useInProgressStories';
import { useFinishedStories } from './useFinishedStories';

export type StoryProgressStatus = 'none' | 'in_progress' | 'completed';

export interface StoryProgressInfo {
  status: StoryProgressStatus;
  progressSeconds?: number;
}

// Builds a storyId -> progress info lookup from the CURRENT USER's own
// in-progress and finished records — both hooks are already scoped to just
// this user's activity (bounded, small), never a scan of the full story
// catalog. Each card then does an O(1) in-memory lookup, no per-card
// network calls.
export function useStoryProgressMap() {
  const { data: inProgress } = useInProgressStories();
  const { data: finished } = useFinishedStories();

  const map = useMemo(() => {
    const m: Record<string, StoryProgressInfo> = {};
    (finished ?? []).forEach((f: any) => {
      if (f.storyId) m[f.storyId] = { status: 'completed' };
    });
    (inProgress ?? []).forEach((p: any) => {
      // Finished takes priority if a story somehow has both records
      if (p.storyId && !m[p.storyId]) {
        m[p.storyId] = { status: 'in_progress', progressSeconds: p.progressSeconds ?? 0 };
      }
    });
    return m;
  }, [inProgress, finished]);

  return map;
}
