import { useQuery } from '@tanstack/react-query';
import { clampWindow, fetchTrendingSnapshot, fetchAllTimePopular } from '../../lib/trending';

// The Trending section: last N days from the hourly snapshot, or all-time popular when it is too early
// for recent plays to mean anything.
export function useTrendingSection(windowDays: number | null | undefined, limit: number = 10) {
  const w = clampWindow(windowDays);
  return useQuery({
    queryKey: ['stories', 'trendingSection', w, limit],
    queryFn: async () => {
      const recent = await fetchTrendingSnapshot(w, limit);
      return recent.length ? recent : fetchAllTimePopular(limit);
    },
    staleTime: 1000 * 60 * 10,
  });
}
