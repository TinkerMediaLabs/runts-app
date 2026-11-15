import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Choice } from './moodPicks';

// Today's mood choice. It lasts until the next local midnight, is kept on the device (so guests have one too),
// and is read by the "Picked for today" Home section. The daily sheet (next step) is what sets it.
const KEY = 'todayChoice.v1';
const LAST_KEY = 'lastMoodChoice.v1';      // the last non-empty choice, for "Same as last time"
const PROMPTED_KEY = 'moodPromptedOn.v1';  // the local day the sheet was last shown (or the person signed up)

export type TodayChoice = Choice & { date: string };

export function localDateKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

export async function getTodayChoice(now: Date = new Date()): Promise<TodayChoice | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as TodayChoice;
    return c?.date === localDateKey(now) ? c : null;   // yesterday's choice is gone at midnight
  } catch { return null; }
}

export async function setTodayChoice(choice: Choice): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...choice, date: localDateKey() }));
    if (choice.moodIds.length || choice.genreIds.length || choice.lengthKeys.length) {
      await AsyncStorage.setItem(LAST_KEY, JSON.stringify(choice));
    }
  } catch { /* not saved: shows nothing */ }
  notify();
}

// "Skip today" is an answer too: an empty choice for today, so the sheet does not come back until tomorrow.
export const skipToday = () => setTodayChoice({ moodIds: [], genreIds: [], lengthKeys: [] });

export async function getLastChoice(): Promise<Choice | null> {
  try { const raw = await AsyncStorage.getItem(LAST_KEY); return raw ? (JSON.parse(raw) as Choice) : null; } catch { return null; }
}

export async function wasPromptedToday(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(PROMPTED_KEY)) === localDateKey(); } catch { return false; }
}
// Called when the sheet is shown, and at sign-up (the sign-up day never gets the sheet).
export async function markPromptedToday(): Promise<void> {
  try { await AsyncStorage.setItem(PROMPTED_KEY, localDateKey()); } catch { /* ignore */ }
}

// Opening the sheet by hand (the Today chip's "Change").
const sheetListeners = new Set<() => void>();
export const openMoodSheet = () => sheetListeners.forEach(l => l());
export const subscribeMoodSheet = (l: () => void) => { sheetListeners.add(l); return () => { sheetListeners.delete(l); }; };

export async function clearTodayChoice(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch { /* ignore */ }
  notify();
}

// The current choice (null = none today). `loaded` is false until the device has been read once.
export function useTodayChoice(): { choice: TodayChoice | null; loaded: boolean } {
  const [state, setState] = useState<{ choice: TodayChoice | null; loaded: boolean }>({ choice: null, loaded: false });
  useEffect(() => {
    let alive = true;
    const load = () => getTodayChoice().then(choice => { if (alive) setState({ choice, loaded: true }); });
    load();
    listeners.add(load);
    return () => { alive = false; listeners.delete(load); };
  }, []);
  return state;
}
