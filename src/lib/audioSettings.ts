import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_SPEED_KEY = '@runts/default_playback_speed';
export const DEFAULT_PLAYBACK_SPEED = 1;

export async function getDefaultPlaybackSpeed(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(DEFAULT_SPEED_KEY);
    return stored ? parseFloat(stored) : DEFAULT_PLAYBACK_SPEED;
  } catch {
    return DEFAULT_PLAYBACK_SPEED;
  }
}

export async function saveDefaultPlaybackSpeed(speed: number): Promise<void> {
  await AsyncStorage.setItem(DEFAULT_SPEED_KEY, speed.toString());
}