import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { getUrl } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';

import { findPinned } from '../../lib/userStoryLookups';

const DOWNLOAD_SYNC_LIMIT = 50;
import {
  getOfflineEnabled,
  getDownloads,
  saveDownloads,
  getTotalDownloadSize,
  getLocalFilePath,
  addOrUpdateDownload,
  removeDownloadRecord,
  ensureAudioDir,
  localPathForStory,
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
}): Promise<{ success: boolean; reason?: string }> {
  const offlineEnabled = await getOfflineEnabled();
  if (!offlineEnabled) return { success: false, reason: 'offline_disabled' };
  if (!story.audioUri) return { success: false, reason: 'no_audio_uri' };

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

    const result = await FileSystem.downloadAsync(
      signedUrl.toString(),
      localPath
    );

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

    const completeRecord = {
      storyId:      story.id,
      audioUri:     story.audioUri,
      localPath,
      fileSize,
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
          fileSize: fileSize + sceneResult.bytes,
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
    const downloadedIds = new Set(downloads.map(d => d.storyId));

    // Delete downloads for stories no longer pinned. Checked per download with an index lookup
    // (downloads are bounded by device storage), so pins beyond the sync window are never deleted.
    const pinnedFlags = await Promise.all(downloads.map(async d => (await findPinned(userId, d.storyId)).length > 0));
    const orphans = downloads.filter((_d, i) => !pinnedFlags[i]);
    await Promise.all(orphans.map(d => deleteDownload(d.storyId)));

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

    downloadStory: async (story: { id: string; audioUri: string; title?: string | null }) => {
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