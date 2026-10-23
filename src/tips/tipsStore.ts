import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tiny external store for first-use tips. Holds: which controls are on screen (by name), the current
// route, context flags (e.g. the player is expanded), which tips were already shown, and whether tips
// are turned on. Seen/enabled are saved on the device, so tips are shown once per install.

const SEEN_KEY    = '@runts/tips_seen';
const ENABLED_KEY = '@runts/tips_enabled';

type TargetRef = { current: any };

type State = {
  loaded:  boolean;
  enabled: boolean;
  seen:    string[];
  route:   string | null;
  flags:   Record<string, boolean>;
  version: number;           // bumps when targets register/unregister so subscribers re-evaluate
};

let state: State = { loaded: false, enabled: true, seen: [], route: null, flags: {}, version: 0 };
const targets = new Map<string, Set<TargetRef>>();
const listeners = new Set<() => void>();

function emit(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}

export async function loadTips(): Promise<void> {
  if (state.loaded) return;
  try {
    const [seenRaw, enabledRaw] = await Promise.all([
      AsyncStorage.getItem(SEEN_KEY),
      AsyncStorage.getItem(ENABLED_KEY),
    ]);
    emit({
      loaded: true,
      seen: seenRaw ? JSON.parse(seenRaw) : [],
      enabled: enabledRaw === null ? true : enabledRaw === 'true',
    });
  } catch {
    emit({ loaded: true });
  }
}

export function registerTarget(name: string, ref: TargetRef) {
  if (!targets.has(name)) targets.set(name, new Set());
  targets.get(name)!.add(ref);
  emit({ version: state.version + 1 });
}

export function unregisterTarget(name: string, ref: TargetRef) {
  targets.get(name)?.delete(ref);
  emit({ version: state.version + 1 });
}

// The ref of a live control with this name (the most recently registered one), or null.
export function getTargetRef(name: string): TargetRef | null {
  const set = targets.get(name);
  if (!set || set.size === 0) return null;
  return Array.from(set)[set.size - 1];
}

export function setTipsRoute(route: string | null | undefined) {
  if ((route ?? null) !== state.route) emit({ route: route ?? null });
}

export function setTipsFlag(name: string, value: boolean) {
  if (state.flags[name] === value) return;
  emit({ flags: { ...state.flags, [name]: value } });
}

export async function markTipSeen(id: string) {
  if (state.seen.includes(id)) return;
  const seen = [...state.seen, id];
  emit({ seen });
  try { await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch {}
}

export async function setTipsEnabled(enabled: boolean) {
  emit({ enabled });
  try { await AsyncStorage.setItem(ENABLED_KEY, String(enabled)); } catch {}
}

// "Show tips again" in settings: forget what was seen and turn tips back on.
export async function resetTips() {
  emit({ seen: [], enabled: true });
  try {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([]));
    await AsyncStorage.setItem(ENABLED_KEY, 'true');
  } catch {}
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useTipsState(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
