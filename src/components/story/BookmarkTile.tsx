import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import { useStoryImage }   from '../../hooks/queries/useStoryImage';
import { useDeleteBookmark } from '../../hooks/queries/useBookmarks';
import { spacing } from '../../theme/spacing';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPosition(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookmarkTileProps {
  bookmark:   any;
  story:      any;
  authorMap:  Record<string, string>;
  tagMap:     Record<string, string>;
  onPlay:     (storyId: string, positionSeconds: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookmarkTile({
  bookmark,
  story,
  authorMap,
  tagMap,
  onPlay,
}: BookmarkTileProps) {
  const { mutate: deleteBookmark, isPending: deleting } = useDeleteBookmark();

  const { data: resolvedImageUri } = useStoryImage(
    story?.imageUri?.startsWith('stories/') ? story.imageUri : null
  );
  const displayImageUri = resolvedImageUri ?? story?.imageUri ?? '';

  const authorName = authorMap[story?.authorId ?? ''] ?? '';
  const tagName    = tagMap[story?.primaryTagId ?? ''] ?? '';

  const handleDelete = () => {
    Alert.alert(
      'Delete Bookmark',
      `Delete "${bookmark.name || 'My Bookmark'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:    'Delete',
          style:   'destructive',
          onPress: () => deleteBookmark(bookmark.id),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPlay(story.id, bookmark.positionSeconds)}
      style={styles.tile}
    >
      {/* Artwork */}
      <Image source={{ uri: displayImageUri }} style={styles.artwork} />

      {/* Content */}
      <View style={styles.content}>

        {/* Bookmark name + position */}
        <View style={styles.topRow}>
          <View style={styles.bookmarkBadge}>
            <FontAwesome5 name={'bookmark' as any} size={9} color="cyan" iconStyle="solid" />
            <Text style={styles.bookmarkName} numberOfLines={1}>
              {bookmark.name || 'My Bookmark'}
            </Text>
          </View>
          <Text style={styles.position}>{formatPosition(bookmark.positionSeconds)}</Text>
        </View>

        {/* Story title */}
        <Text style={styles.storyTitle} numberOfLines={1}>{story.title}</Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {authorName ? <Text style={styles.metaText}>{authorName}</Text> : null}
          {authorName && tagName ? <Text style={styles.metaDot}>·</Text> : null}
          {tagName ? <Text style={styles.metaText}>{tagName}</Text> : null}
          {(authorName || tagName) && story.duration ? (
            <Text style={styles.metaDot}>·</Text>
          ) : null}
          {story.duration ? (
            <Text style={styles.metaText}>{formatDuration(story.duration)}</Text>
          ) : null}
        </View>

      </View>

      {/* Delete button */}
      <TouchableOpacity
        onPress={handleDelete}
        disabled={deleting}
        style={styles.deleteBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <FontAwesome5
          name={'times' as any}
          size={13}
          color="rgba(255,255,255,0.35)"
          iconStyle="solid"
        />
      </TouchableOpacity>

    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.margin,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e1e',
    gap: 12,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bookmarkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  bookmarkName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'cyan',
    flex: 1,
  },
  position: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  storyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  metaDot: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
  },
  deleteBtn: {
    padding: 8,
    flexShrink: 0,
  },
});