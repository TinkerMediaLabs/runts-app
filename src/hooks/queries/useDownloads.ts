import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { getUrl } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';

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
  STORAGE_LIMIT_BYTES,
  type DownloadRecord,
} from '../../lib/offlineStorage';

const client = generateClient<Schema>();

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

    await addOrUpdateDownload({
      storyId:      story.id,
      audioUri:     story.audioUri,
      localPath,
      fileSize,
      downloadedAt: new Date().toISOString(),
      status:       'complete',
    });

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
 * Deletes the local audio file and removes the download record.
 */
export async function deleteDownload(storyId: string): Promise<void> {
  const records = await getDownloads();
  const record  = records.find(r => r.storyId === storyId);
  if (record?.localPath) {
    await FileSystem.deleteAsync(record.localPath, { idempotent: true });
  }
  await removeDownloadRecord(storyId);
}

/**
 * Deletes all downloaded files and clears all download records.
 */
export async function clearAllDownloads(): Promise<void> {
  const records = await getDownloads();
  await Promise.all(
    records.map(r => FileSystem.deleteAsync(r.localPath, { idempotent: true }))
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

    const { data: pinnedRecords } = await client.models.UserPinnedStory.list({
      filter: { userId: { eq: userId } },
    });

    const pinnedIds     = new Set((pinnedRecords ?? []).map(p => p.storyId));
    const downloads     = await getDownloads();
    const downloadedIds = new Set(downloads.map(d => d.storyId));

    // Delete downloads for stories no longer pinned
    const orphans = downloads.filter(d => !pinnedIds.has(d.storyId));
    await Promise.all(orphans.map(d => deleteDownload(d.storyId)));

    // Download pinned stories not yet downloaded
    const toDownload = (pinnedRecords ?? []).filter(
      p => p.storyId && !downloadedIds.has(p.storyId)
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