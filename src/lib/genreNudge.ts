import AsyncStorage from '@react-native-async-storage/async-storage';
import { newGenreIds } from './taste';

// Which genres this listener has already been shown, kept on the device. The first time we ever look,
// everything that exists counts as seen (no nudge for a fresh install); after that, a genre that appears
// in the list but not in the seen set is "new".
const KEY = (userId: string) => `@runts/seenGenres/${userId}`;

export async function readSeenGenres(userId: string): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch { return null; }
}

export async function markGenresSeen(userId: string, ids: string[]) {
  try {
    const seen = (await readSeenGenres(userId)) ?? [];
    await AsyncStorage.setItem(KEY(userId), JSON.stringify(Array.from(new Set([...seen, ...ids]))));
  } catch { /* nudge just shows again next time */ }
}

// Returns the ids of new genres to tell the listener about (empty on first run, which also records the baseline).
export async function findNewGenres(userId: string, allIds: string[]): Promise<string[]> {
  const seen = await readSeenGenres(userId);
  if (seen === null) { await markGenresSeen(userId, allIds); return []; }
  return newGenreIds(allIds, seen);
}
