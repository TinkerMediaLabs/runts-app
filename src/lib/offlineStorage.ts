import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const OFFLINE_ENABLED_KEY = '@runts/offline_enabled';
export const WIFI_ONLY_KEY       = '@runts/wifi_only_downloads';
export const DOWNLOADS_KEY       = '@runts/downloads';
export const STORAGE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
export const AUDIO_DIR = `${(FileSystem as any).documentDirectory ?? ''}audio/`;
export const COVERS_DIR = `${(FileSystem as any).documentDirectory ?? ''}covers/`;
export const SCENES_DIR = `${(FileSystem as any).documentDirectory ?? ''}scenes/`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DownloadStatus = 'complete' | 'downloading' | 'failed';

// A picture-book scene saved for offline use (image file on device + its timing).
export type DownloadScene = {
  startSeconds: number;
  imageUri:     string;   // original S3 key (matches StoryScene.imageUri)
  localPath:    string;   // absolute on-device path
  altText:      string;
};

export type DownloadRecord = {
  storyId:      string;
  audioUri:     string;   // original S3 path — used for local lookup
  localPath:    string;   // absolute on-device path
  fileSize:     number;   // bytes (0 while downloading or on failure)
  downloadedAt: string;   // ISO timestamp
  status:       DownloadStatus;
  coverUri?:    string;   // original S3 key of the cover image (matches Story.imageUri)
  coverPath?:   string;   // absolute on-device path of the saved cover
  scenes?:      DownloadScene[];   // picture-book scenes, when the story has any (fileSize includes their bytes)
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

/** Default is ON — downloads wait for Wi-Fi so mobile data is not used by surprise. */
export async function getWifiOnly(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(WIFI_ONLY_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export async function saveWifiOnly(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(WIFI_ONLY_KEY, enabled.toString());
}

/** Whether a download may start now: needs a connection, and Wi-Fi when the Wi-Fi-only setting is on. */
export async function canDownloadNow(): Promise<{ ok: boolean; reason?: 'offline' | 'wifi_only' }> {
  try {
    const net = await NetInfo.fetch();
    if (net.isConnected === false || net.isInternetReachable === false) return { ok: false, reason: 'offline' };
    if (await getWifiOnly()) {
      const onWifi = net.type === 'wifi' || net.type === 'ethernet';
      if (!onWifi) return { ok: false, reason: 'wifi_only' };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
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
  coverIndex = null;
  downloadedIds = new Set(records.filter(r => r.status === 'complete').map(r => r.storyId));
  statusById = new Map(records.map(r => [r.storyId, r.status] as [string, DownloadStatus]));
  listeners.forEach(l => l());
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(records));
}

// Which stories are saved on the device (complete downloads), shared so any tile can show a badge
// without reading storage. Loaded once, then kept current by saveDownloads.
let downloadedIds: Set<string> | null = null;
const listeners = new Set<() => void>();

let statusById: Map<string, DownloadStatus> | null = null;

/** Download status per story (complete / downloading / failed), shared and kept current by saveDownloads. */
export async function getDownloadStatuses(): Promise<Map<string, DownloadStatus>> {
  if (!statusById) {
    statusById = new Map((await getDownloads()).map(r => [r.storyId, r.status] as [string, DownloadStatus]));
  }
  return statusById;
}

export async function getDownloadedIds(): Promise<Set<string>> {
  if (!downloadedIds) {
    downloadedIds = new Set((await getDownloads()).filter(r => r.status === 'complete').map(r => r.storyId));
  }
  return downloadedIds;
}

export function subscribeDownloaded(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// In-memory lookup of saved covers (S3 key -> local file), rebuilt after every change to the records,
// so tiles can resolve a cover without reading storage each time.
let coverIndex: Map<string, string> | null = null;

/** Local file for a cover image key when that story's cover was saved for offline use, else null. */
export async function getLocalCoverPath(s3Path: string): Promise<string | null> {
  if (!coverIndex) {
    const map = new Map<string, string>();
    (await getDownloads()).forEach(r => {
      if (r.status === 'complete' && r.coverUri && r.coverPath) map.set(r.coverUri, r.coverPath);
    });
    coverIndex = map;
  }
  return coverIndex.get(s3Path) ?? null;
}

/** Canonical local path for a story's saved cover. */
export function coverPathForStory(storyId: string): string {
  return COVERS_DIR + storyId + '.jpg';
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

/** Folder holding a story's offline scene images. */
export function sceneDirForStory(storyId: string): string {
  return SCENES_DIR + storyId + '/';
}

/** The saved scenes for a story, or [] when none are downloaded. */
export async function getOfflineScenes(storyId: string): Promise<DownloadScene[]> {
  const records = await getDownloads();
  const record  = records.find(r => r.storyId === storyId && r.status === 'complete');
  return record?.scenes ?? [];
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