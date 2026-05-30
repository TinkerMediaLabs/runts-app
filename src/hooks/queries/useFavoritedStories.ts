import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

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

export function useFavoritedStories(threshold: number) {
  return useQuery({
    queryKey: ['favoritedStories', threshold],
    queryFn: async () => {
      const { userId } = await getCurrentUser();

      const { data: ratings } = await client.models.UserRating.list({
        filter: {
          and: [
            { userId: { eq: userId } },
            { rating: { ge: threshold } },
          ],
        },
      });

      if (!ratings?.length) return [];

      const storyResults = await Promise.all(
        ratings.map(r => client.models.Story.get({ id: r.storyId }))
      );

      // Attach the user's rating to each story and sort by rating desc
      return storyResults
        .map(r => r.data)
        .filter(Boolean)
        .map(story => ({
          ...story,
          userRating: ratings.find(r => r.storyId === story!.id)?.rating ?? 0,
        }))
        .sort((a, b) => b.userRating - a.userRating);
    },
    enabled: threshold > 0,
    staleTime: 1000 * 60 * 2,
  });
}