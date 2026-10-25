import AsyncStorage from '@react-native-async-storage/async-storage';

// Small physical confirmations (a light tap on pin, a double pulse on success). Safe everywhere:
// if the phone build does not include the haptics module yet, every call quietly does nothing.
const KEY = '@runts/haptics_enabled';

let Haptics: any = null;
try {
  // The JS package can be present while the phone build lacks the native part, so check that too.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { requireOptionalNativeModule } = require('expo-modules-core');
  if (requireOptionalNativeModule('ExpoHaptics')) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Haptics = require('expo-haptics');
  }
} catch {
  Haptics = null;
}

let enabled = true;
AsyncStorage.getItem(KEY).then(v => { if (v !== null) enabled = v === 'true'; }).catch(() => {});

export const hapticsAvailable = () => !!Haptics;
export const getHapticsEnabled = async (): Promise<boolean> => {
  try { const v = await AsyncStorage.getItem(KEY); return v === null ? true : v === 'true'; } catch { return true; }
};
export const saveHapticsEnabled = async (value: boolean) => {
  enabled = value;
  try { await AsyncStorage.setItem(KEY, String(value)); } catch {}
  // Turning it on gives a sample pulse so the listener can feel what it does.
  if (value) successHaptic();
};

const run = (fn: () => Promise<void>) => {
  if (!enabled || !Haptics) return;
  try { fn().catch(err => console.warn('haptics: failed', err)); } catch (err) { console.warn('haptics: failed', err); }
};

/** A tap (medium strength, so it is noticeable on Android motors): pin, play, pause, skip. */
export const tapHaptic = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
/** A selection tick: choosing an option. */
export const selectHaptic = () => run(() => Haptics.selectionAsync());
/** A success pulse: rating submitted, bookmark saved, story pinned. */
export const successHaptic = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
