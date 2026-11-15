import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Choice } from './moodPicks';

// Today's mood choice. It lasts until the next local midnight, is kept on the device (so guests have one too),
// and is read by the "Picked for today" Home section. The daily sheet (next step) is what sets it.
const KEY = 'todayChoice.v1';

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
  try { await AsyncStorage.setItem(KEY, JSON.stringify({ ...choice, date: localDateKey() })); } catch { /* not saved: shows nothing */ }
  notify();
}

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
