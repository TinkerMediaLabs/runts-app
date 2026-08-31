import { useApp } from '@/context/AppContext';

/**
 * Returns true if a story should be locked behind the paywall.
 *
 * Logic:
 * - story.isPremium === true → always locked (regardless of genre)
 * - story.isPremium === false → always free (explicit override)
 * - story.isPremium === null/undefined → locked if genre isPremiumGenre === true
 */
export function useIsLocked(story: any, primaryTag?: any): boolean {
    const { isPremium: userIsPremium } = useApp();

    if (userIsPremium) return false; // premium users never locked

    if (story?.isPremium === true)  return true;
    if (story?.isPremium === false) return false;

    // Fall back to genre-level check
    return primaryTag?.isPremiumGenre === true;
}