import { useInfiniteQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { useApp } from '@/context/AppContext';



export const FAVORITE_THRESHOLD_KEY = '@runts/favorite_threshold';
export const DEFAULT_THRESHOLD      = 8;

export async function getFavoriteThreshold(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(FAVORITE_THRESHOLD_KEY);
    return stored ? parseInt(stored) : DEFAULT_THRESHOLD;
  } catch {
    return DEFAULT_THRESHOLD;
  }
}

export async function saveFavoriteThreshold(threshold: number): Promise<void> {
  await AsyncStorage.setItem(FAVORITE_THRESHOLD_KEY, threshold.toString());
}

const FAVORITES_PAGE_SIZE = 20;

// Paged: one page of ratings (index is sorted by rating, highest first) + a Story get for just
// that page. Scales to any number of rated stories; the list loads more as you scroll.
export function useFavoritedStories(threshold: number) {
    const { eroticEnabled } = useApp();

    return useInfiniteQuery({
        queryKey: ['favoritedStories', threshold, eroticEnabled],
        queryFn: async ({ pageParam }: { pageParam: string | null }) => {
            const client = generateClient<Schema>();
            const { userId } = await getCurrentUser();

            const res: any = await (client.models.UserRating as any).listUserRatingByUserIdAndRating(
                { userId, rating: { ge: threshold } },
                { sortDirection: 'DESC', limit: FAVORITES_PAGE_SIZE, nextToken: pageParam ?? undefined });
            if (res.errors?.length) throw new Error(res.errors[0].message);
            const ratings: any[] = res.data ?? [];

            const storyResults = await Promise.all(
                ratings.map((r: any) => client.models.Story.get({ id: r.storyId }))
            );

            const items = storyResults
                .map((r: any, i: number) => (r.data ? { ...r.data, userRating: ratings[i]?.rating ?? 0 } : null))
                .filter(Boolean)
                // Hide erotic favorites when erotic content is disabled
                .filter((story: any) => eroticEnabled || story.isErotic !== 'true');

            return { items: items as any[], nextToken: (res.nextToken ?? null) as string | null };
        },
        initialPageParam: null as string | null,
        getNextPageParam: (last) => last.nextToken,
        enabled: threshold > 0,
        staleTime: 1000 * 60 * 2,
    });
}
