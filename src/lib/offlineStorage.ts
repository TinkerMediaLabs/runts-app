import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const OFFLINE_ENABLED_KEY = '@runts/offline_enabled';
export const DOWNLOADS_KEY       = '@runts/downloads';
export const STORAGE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
export const AUDIO_DIR = `${(FileSystem as any).documentDirectory ?? ''}audio/`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DownloadStatus = 'complete' | 'downloading' | 'failed';

export type DownloadRecord = {
  storyId:      string;
  audioUri:     string;   // original S3 path — used for local lookup
  localPath:    string;   // absolute on-device path
  fileSize:     number;   // bytes (0 while downloading or on failure)
  downloadedAt: string;   // ISO timestamp
  status:       DownloadStatus;
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Default is ON — offline support enabled out of the box. */
export async function getOfflineEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(OFFLINE_ENABLED_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export async function saveOfflineEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_ENABLED_KEY, enabled.toString());
}

// ---------------------------------------------------------------------------
// Download record management
// ---------------------------------------------------------------------------

export async function getDownloads(): Promise<DownloadRecord[]> {
  try {
    const val = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function saveDownloads(records: DownloadRecord[]): Promise<void> {
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(records));
}

/** Total bytes of completed downloads only. */
export async function getTotalDownloadSize(): Promise<number> {
  const records = await getDownloads();
  return records
    .filter(r => r.status === 'complete')
    .reduce((sum, r) => sum + r.fileSize, 0);
}

/**
 * Returns the absolute local file path for an S3 path if a completed
 * download exists, otherwise null.
 */
export async function getLocalFilePath(s3Path: string): Promise<string | null> {
  const records = await getDownloads();
  const record  = records.find(r => r.audioUri === s3Path && r.status === 'complete');
  return record?.localPath ?? null;
}

export async function addOrUpdateDownload(record: DownloadRecord): Promise<void> {
  const records = await getDownloads();
  const idx     = records.findIndex(r => r.storyId === record.storyId);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  await saveDownloads(records);
}

export async function removeDownloadRecord(storyId: string): Promise<void> {
  const records = await getDownloads();
  await saveDownloads(records.filter(r => r.storyId !== storyId));
}

// ---------------------------------------------------------------------------
// File system helpers
// ---------------------------------------------------------------------------

export async function ensureAudioDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
  }
}

/** Canonical local path for a story's audio file. */
export function localPathForStory(storyId: string): string {
  return AUDIO_DIR + storyId + '.mp3';
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}