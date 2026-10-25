import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { getUrl } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';

import { findPinned } from '../../lib/userStoryLookups';
import { setDownloadProgress, clearDownloadProgress } from '../../lib/downloadProgress';

// Stories being downloaded right now, so two syncs never fetch the same file twice.
const inFlight = new Set<string>();

const DOWNLOAD_SYNC_LIMIT = 50;
import {
  getOfflineEnabled,
  canDownloadNow,
  getDownloads,
  saveDownloads,
  getTotalDownloadSize,
  getLocalFilePath,
  addOrUpdateDownload,
  removeDownloadRecord,
  ensureAudioDir,
  localPathForStory,
  coverPathForStory,
  COVERS_DIR,
  sceneDirForStory,
  STORAGE_LIMIT_BYTES,
  type DownloadScene,
  type DownloadRecord,
} from '../../lib/offlineStorage';



// ---------------------------------------------------------------------------
// Standalone functions — safe to call outside React components
// ---------------------------------------------------------------------------

/**
 * Downloads a story's audio file to device storage.
 * Guards against exceeding the 500MB limit.
 * Returns { success: true } if downloaded (or already exists).
 */
export async function downloadStory(story: {
  id: string;
  audioUri: string;
  title?: string | null;
  imageUri?: string | null;
}): Promise<{ success: boolean; reason?: string }> {
  const offlineEnabled = await getOfflineEnabled();
  if (!offlineEnabled) return { success: false, reason: 'offline_disabled' };
  if (!story.audioUri) return { success: false, reason: 'no_audio_uri' };

  // Waits for Wi-Fi (when that setting is on) and a connection. The next sync picks it up.
  const allowed = await canDownloadNow();
  if (!allowed.ok) return { success: false, reason: allowed.reason };

  if (inFlight.has(story.id)) return { success: false, reason: 'in_progress' };
  inFlight.add(story.id);
  try {
    return await downloadStoryInner(story);
  } finally {
    inFlight.delete(story.id);
    clearDownloadProgress(story.id);
  }
}

async function downloadStoryInner(story: {
  id: string;
  audioUri: string;
  title?: string | null;
  imageUri?: string | null;
}): Promise<{ success: boolean; reason?: string }> {
  // Already downloaded and file still on disk?
  const existingPath = await getLocalFilePath(story.audioUri);
  if (existingPath) {
    const info = await FileSystem.getInfoAsync(existingPath);
    if (info.exists) return { success: true };
    // File record exists but file is gone — clean up and re-download
    await removeDownloadRecord(story.id);
  }

  // Conservative pre-flight space check (actual size confirmed after download)
  const currentSize    = await getTotalDownloadSize();
  const ESTIMATE_BYTES = 25 * 1024 * 1024; // 25 MB estimate
  if (currentSize + ESTIMATE_BYTES > STORAGE_LIMIT_BYTES) {
    return { success: false, reason: 'storage_limit' };
  }

  await ensureAudioDir();
  const localPath = localPathForStory(story.id);

  // Mark as in-progress
  await addOrUpdateDownload({
    storyId:      story.id,
    audioUri:     story.audioUri,
    localPath,
    fileSize:     0,
    downloadedAt: new Date().toISOString(),
    status:       'downloading',
  });

  try {
    // Get a short-lived signed URL just for the download
    const { url: signedUrl } = await getUrl({
      path: story.audioUri,
      options: { expiresIn: 3600 },
    });

    setDownloadProgress(story.id, 0);
    const resumable = FileSystem.createDownloadResumable(
      signedUrl.toString(),
      localPath,
      {},
      p => {
        if (p.totalBytesExpectedToWrite > 0) {
          // Audio is most of the work; leave the last few percent for the cover and scenes.
          setDownloadProgress(story.id, (p.totalBytesWritten / p.totalBytesExpectedToWrite) * 0.95);
        }
      },
    );
    const result = await resumable.downloadAsync();
    if (!result) throw new Error('Download was cancelled');

    if (result.status !== 200) {
      await addOrUpdateDownload({
        storyId:      story.id,
        audioUri:     story.audioUri,
        localPath,
        fileSize:     0,
        downloadedAt: new Date().toISOString(),
        status:       'failed',
      });
      return { success: false, reason: 'http_error' };
    }

    // Confirm actual file size against limit
    const info     = await FileSystem.getInfoAsync(localPath);
    const fileSize = (info as any).size ?? 0;

    if (currentSize + fileSize > STORAGE_LIMIT_BYTES) {
      // Exceeded limit with real size — delete and bail
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      await removeDownloadRecord(story.id);
      return { success: false, reason: 'storage_limit' };
    }

    // Cover image: best effort, so tiles and the player show artwork offline.
    const cover = await downloadCover(story.id, story.imageUri);

    const completeRecord = {
      storyId:      story.id,
      audioUri:     story.audioUri,
      localPath,
      fileSize:     fileSize + cover.bytes,
      ...(cover.path ? { coverUri: story.imageUri as string, coverPath: cover.path } : {}),
      downloadedAt: new Date().toISOString(),
      status:       'complete' as const,
    };
    await addOrUpdateDownload(completeRecord);

    // Picture-book scenes: best effort. The story is already playable offline; scenes are saved on top
    // when they fit under the storage limit. A failed image just falls back to the online image.
    try {
      const sceneResult = await downloadScenes(story.id, currentSize + fileSize);
      if (sceneResult.scenes.length > 0) {
        await addOrUpdateDownload({
          ...completeRecord,
          fileSize: completeRecord.fileSize + sceneResult.bytes,
          scenes:   sceneResult.scenes,
        });
      }
    } catch (sceneErr) {
      console.warn('downloadScenes error:', sceneErr);
    }

    return { success: true };

  } catch (err) {
    console.error('downloadStory error:', err);
    await addOrUpdateDownload({
      storyId:      story.id,
      audioUri:     story.audioUri,
      localPath,
      fileSize:     0,
      downloadedAt: new Date().toISOString(),
      status:       'failed',
    });
    return { success: false, reason: 'error' };
  }
}

/** Saves a story's cover image on the device. Returns where it went and its size; never throws. */
async function downloadCover(storyId: string, imageUri?: string | null): Promise<{ path: string | null; bytes: number }> {
  if (!imageUri || !imageUri.startsWith('stories/')) return { path: null, bytes: 0 };
  try {
    await FileSystem.makeDirectoryAsync(COVERS_DIR, { intermediates: true }).catch(() => {});
    const dest = coverPathForStory(storyId);
    const { url } = await getUrl({ path: imageUri, options: { expiresIn: 3600 } });
    const out = await FileSystem.downloadAsync(url.toString(), dest);
    if (out.status !== 200) { await FileSystem.deleteAsync(dest, { idempotent: true }); return { path: null, bytes: 0 }; }
    const info = await FileSystem.getInfoAsync(dest);
    return { path: dest, bytes: (info as any).size ?? 0 };
  } catch (err) {
    console.warn('downloadCover error:', err);
    return { path: null, bytes: 0 };
  }
}

/** Adds a cover to an existing complete download that was saved before covers were stored. */
async function backfillCover(storyId: string): Promise<void> {
  const records = await getDownloads();
  const record = records.find(r => r.storyId === storyId && r.status === 'complete');
  if (!record || record.coverPath) return;
  const client = generateClient<Schema>();
  const { data: story } = await client.models.Story.get({ id: storyId });
  const cover = await downloadCover(storyId, story?.imageUri);
  if (!cover.path) return;
  await addOrUpdateDownload({ ...record, fileSize: record.fileSize + cover.bytes, coverUri: story!.imageUri as string, coverPath: cover.path });
}

/**
 * Downloads a story's picture-book scene images (if it has any) into the story's scene folder.
 * Returns the saved scenes and their total bytes. Skips images that would pass the storage limit.
 */
async function downloadScenes(storyId: string, usedBytes: number): Promise<{ scenes: DownloadScene[]; bytes: number }> {
  const client = generateClient<Schema>();
  const { data: story } = await client.models.Story.get({ id: storyId });
  if (!story || (story.sceneCount ?? 0) <= 0) return { scenes: [], bytes: 0 };

  const res: any = await (client.models.StoryScene as any).listStorySceneByStoryIdAndStartSeconds(
    { storyId }, { sortDirection: 'ASC', limit: 100 });
  const rows: any[] = res.data ?? [];
  if (rows.length === 0) return { scenes: [], bytes: 0 };

  const dir = sceneDirForStory(storyId);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

  const scenes: DownloadScene[] = [];
  let bytes = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const { url } = await getUrl({ path: row.imageUri, options: { expiresIn: 3600 } });
      const dest = `${dir}${i}.jpg`;
      const out = await FileSystem.downloadAsync(url.toString(), dest);
      if (out.status !== 200) { await FileSystem.deleteAsync(dest, { idempotent: true }); continue; }
      const info = await FileSystem.getInfoAsync(dest);
      const size = (info as any).size ?? 0;
      if (usedBytes + bytes + size > STORAGE_LIMIT_BYTES) {
        await FileSystem.deleteAsync(dest, { idempotent: true });
        break;
      }
      bytes += size;
      scenes.push({ startSeconds: row.startSeconds, imageUri: row.imageUri, localPath: dest, altText: row.altText ?? '' });
    } catch (err) {
      console.warn('scene image download failed:', err);
    }
  }
  return { scenes, bytes };
}

/** Retries a failed or stalled download for one story (looks the story up first). */
export async function retryDownload(storyId: string): Promise<{ success: boolean; reason?: string }> {
  const client = generateClient<Schema>();
  const { data: story } = await client.models.Story.get({ id: storyId });
  if (!story?.audioUri) return { success: false, reason: 'no_audio_uri' };
  return downloadStory({ id: story.id, audioUri: story.audioUri, title: story.title, imageUri: story.imageUri });
}

/**
 * Deletes the local audio file (and any scene images) and removes the download record.
 */
export async function deleteDownload(storyId: string): Promise<void> {
  const records = await getDownloads();
  const record  = records.find(r => r.storyId === storyId);
  if (record?.localPath) {
    await FileSystem.deleteAsync(record.localPath, { idempotent: true });
  }
  await FileSystem.deleteAsync(sceneDirForStory(storyId), { idempotent: true });
  await FileSystem.deleteAsync(coverPathForStory(storyId), { idempotent: true });
  await removeDownloadRecord(storyId);
}

/**
 * Deletes all downloaded files and clears all download records.
 */
export async function clearAllDownloads(): Promise<void> {
  const records = await getDownloads();
  await Promise.all(
    records.flatMap(r => [
      FileSystem.deleteAsync(r.localPath, { idempotent: true }),
      FileSystem.deleteAsync(sceneDirForStory(r.storyId), { idempotent: true }),
      FileSystem.deleteAsync(coverPathForStory(r.storyId), { idempotent: true }),
    ])
  );
  await saveDownloads([]);
}

/**
 * Syncs downloads with the current pinned list:
 * - Downloads any pinned stories not yet downloaded (up to storage limit)
 * - Deletes downloads for stories that are no longer pinned
 *
 * Called on app startup (after auth resolves) and when offline mode is
 * toggled on. Downloads are sequential to avoid hammering S3 and device I/O.
 */
export async function syncDownloads(): Promise<void> {

  const offlineEnabled = await getOfflineEnabled();

  if (!offlineEnabled) return;
  if (!(await canDownloadNow()).ok) return;

  try {
    const { userId } = await getCurrentUser();
    const client = generateClient<Schema>();

    // Auto-download only the first DOWNLOAD_SYNC_LIMIT pins (top of the list = what the user
    // will listen to next). A user can have thousands of pins; downloads are limited by device
    // storage anyway, and pinning a story downloads it at pin time.
    const pinsRes: any = await (client.models.UserPinnedStory as any).listUserPinnedStoryByUserIdAndSortOrder(
        { userId }, { sortDirection: 'ASC', limit: DOWNLOAD_SYNC_LIMIT });
    const pinnedRecords: any[] = pinsRes.data ?? [];

    const downloads     = await getDownloads();
    const downloadedIds = new Set(downloads.filter(d => d.status === 'complete').map(d => d.storyId));

    // Delete downloads for stories no longer pinned. Checked per download with an index lookup
    // (downloads are bounded by device storage), so pins beyond the sync window are never deleted.
    const pinnedFlags = await Promise.all(downloads.map(async d => (await findPinned(userId, d.storyId)).length > 0));
    const orphans = downloads.filter((_d, i) => !pinnedFlags[i]);
    await Promise.all(orphans.map(d => deleteDownload(d.storyId)));

    // Older downloads saved before covers were stored get their cover now (best effort).
    for (const d of downloads) {
      if (d.status === 'complete' && !d.coverPath) await backfillCover(d.storyId).catch(() => {});
    }

    // Download pinned stories not yet downloaded
    const toDownload = (pinnedRecords ?? []).filter(
      (p : any) => p.storyId && !downloadedIds.has(p.storyId)
    );

    for (const record of toDownload) {
      if (!record.storyId) continue;

      const { data: story } = await client.models.Story.get({ id: record.storyId });

      if (!story?.audioUri) continue;

      const result = await downloadStory({
        id:       story.id,
        audioUri: story.audioUri,
        title:    story.title,
        imageUri: story.imageUri,
      });


      if (!result.success && result.reason === 'storage_limit') {

        break;
      }
    }
  } catch (err) {
    console.warn('syncDownloads error:', err);
  }
}

// ---------------------------------------------------------------------------
// React hook — provides download state for UI
// ---------------------------------------------------------------------------

export function useDownloads() {
  const [downloads,  setDownloads]  = useState<DownloadRecord[]>([]);
  const [totalSize,  setTotalSize]  = useState(0);
  const [isLoading,  setIsLoading]  = useState(true);

  const refresh = useCallback(async () => {
    const recs = await getDownloads();
    const size = recs
      .filter(r => r.status === 'complete')
      .reduce((sum, r) => sum + r.fileSize, 0);
    setDownloads(recs);
    setTotalSize(size);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  const isDownloaded = useCallback(
    (storyId: string) =>
      downloads.some(d => d.storyId === storyId && d.status === 'complete'),
    [downloads]
  );

  const isDownloading = useCallback(
    (storyId: string) =>
      downloads.some(d => d.storyId === storyId && d.status === 'downloading'),
    [downloads]
  );

  return {
    downloads,
    totalSize,
    isLoading,
    isDownloaded,
    isDownloading,
    refresh,

    downloadStory: async (story: { id: string; audioUri: string; title?: string | null; imageUri?: string | null }) => {
      const result = await downloadStory(story);
      await refresh();
      return result;
    },

    deleteDownload: async (storyId: string) => {
      await deleteDownload(storyId);
      await refresh();
    },

    clearAllDownloads: async () => {
      await clearAllDownloads();
      await refresh();
    },
  };
}