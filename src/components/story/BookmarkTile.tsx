import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Text } from '@/components/common/AppText';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import { useStoryImage }   from '../../hooks/queries/useStoryImage';
import { useDeleteBookmark } from '../../hooks/queries/useBookmarks';
import { spacing } from '../../theme/spacing';

import { CachedImage } from '../common/CachedImage';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';
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
      accessibilityRole="button"
      accessibilityLabel={`${bookmark.name || 'My Bookmark'}, at ${formatPosition(bookmark.positionSeconds)} in ${story.title}${authorName ? `, by ${authorName}` : ''}`}
      accessibilityHint="Plays from this bookmark"
      accessibilityActions={[{ name: 'delete', label: 'Delete bookmark' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'delete') handleDelete();
      }}
    >
      {/* Artwork */}
      <CachedImage source={{ uri: displayImageUri }} style={styles.artwork} />

      {/* Content */}
      <View style={styles.content}>

        {/* Bookmark name + position */}
        <View style={styles.topRow}>
          <View style={styles.bookmarkBadge}>
            <FontAwesome5 name={'bookmark' as any} size={9} color={colors.accent} iconStyle="solid" />
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
        accessibilityRole="button"
        accessibilityLabel="Delete bookmark"
        style={styles.deleteBtn}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      >
        <FontAwesome5
          name={'times' as any}
          size={iconSize.xs}
          color={colors.textTertiary}
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
    borderBottomColor: colors.borderSubtle,
    gap: 12,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
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
    fontSize: fontSizes.small,
    fontWeight: '600',
    color: colors.accent,
    flex: 1,
  },
  position: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  storyTitle: {
    fontSize: fontSizes.small,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaText: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  metaDot: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  deleteBtn: {
    padding: 8,
    flexShrink: 0,
  },
});