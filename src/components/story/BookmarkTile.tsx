import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { spacing } from '../../theme/spacing';

import { CachedImage } from '../common/CachedImage';
import SwipeActionRow, { type SwipeAction } from '../common/SwipeActionRow';
import { colors } from '@/theme/colors';
import { fontSizes, radius } from '@/theme/tokens';
import Icon from '@/components/common/Icon';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatPosition(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const BOOKMARK_ICON = 18;

const useActions = (bookmark: any, onEdit: (b: any) => void, onDelete: (b: any) => void): SwipeAction[] => [
  { key: 'delete', label: 'Delete', icon: 'trash', color: colors.dangerSolid, onPress: () => onDelete(bookmark) },
  { key: 'edit',   label: 'Edit',   icon: 'pen',   color: '#4a5568',           onPress: () => onEdit(bookmark) },
];

const useStoryArt = (story: any) => {
  const { data } = useStoryImage(story?.imageUri?.startsWith('stories/') ? story.imageUri : null);
  return data ?? story?.imageUri ?? '';
};

const metaLine = (story: any, authorMap: Record<string, string>, tagMap: Record<string, string>) =>
  [authorMap[story?.authorId ?? ''], tagMap[story?.primaryTagId ?? '']].filter(Boolean).join(' · ');

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CommonProps = {
  story:     any;
  authorMap: Record<string, string>;
  tagMap:    Record<string, string>;
  onPlay:    (story: any, positionSeconds: number) => void;
  onEdit:    (bookmark: any) => void;
  onDelete:  (bookmark: any) => void;
};

// ---------------------------------------------------------------------------
// One bookmark on its own story: artwork, bookmark name, story, where it is saved, and a grabber that swipes open
// Delete and Edit.
// ---------------------------------------------------------------------------

export default function BookmarkTile({ bookmark, story, authorMap, tagMap, onPlay, onEdit, onDelete }: CommonProps & { bookmark: any }) {
  const art = useStoryArt(story);
  const actions = useActions(bookmark, onEdit, onDelete);
  const name = bookmark.name || 'My Bookmark';
  const meta = metaLine(story, authorMap, tagMap);

  return (
    <SwipeActionRow actions={actions}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPlay(story, bookmark.positionSeconds)}
        style={styles.tile}
        accessibilityRole="button"
        accessibilityLabel={`${name}, at ${formatPosition(bookmark.positionSeconds)} in ${story.title}${meta ? `, ${meta}` : ''}`}
        accessibilityHint="Plays from this bookmark"
        accessibilityActions={[{ name: 'delete', label: 'Delete bookmark' }, { name: 'edit', label: 'Rename bookmark' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'delete') onDelete(bookmark);
          if (e.nativeEvent.actionName === 'edit') onEdit(bookmark);
        }}
      >
        <CachedImage source={{ uri: art }} style={styles.artwork} />

        <View style={styles.content}>
          <View style={styles.nameRow}>
            <Icon name="bookmark" size={BOOKMARK_ICON} color={colors.accent} weight="fill" />
            <Text style={styles.bookmarkName} numberOfLines={1}>{name}</Text>
          </View>
          <Text style={styles.storyTitle} numberOfLines={1}>{story.title}</Text>
          {meta ? <Text style={styles.metaText} numberOfLines={1}>{meta}</Text> : null}
        </View>

        <Text style={styles.position}>{formatPosition(bookmark.positionSeconds)}</Text>
      </TouchableOpacity>
    </SwipeActionRow>
  );
}

// ---------------------------------------------------------------------------
// Several bookmarks on one story: the story once, a count, and the bookmarks underneath when opened.
// ---------------------------------------------------------------------------

export function BookmarkGroup({ bookmarks, expanded, onToggle, story, authorMap, tagMap, onPlay, onEdit, onDelete }:
  CommonProps & { bookmarks: any[]; expanded: boolean; onToggle: () => void }) {
  const art = useStoryArt(story);
  const meta = metaLine(story, authorMap, tagMap);
  const count = `${bookmarks.length} bookmarks`;

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onToggle}
        style={styles.tile}
        accessibilityRole="button"
        accessibilityLabel={`${story.title}, ${count}`}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? 'Hides the bookmarks' : 'Shows the bookmarks'}
      >
        <CachedImage source={{ uri: art }} style={styles.artwork} />
        <View style={styles.content}>
          <Text style={styles.storyTitle} numberOfLines={1}>{story.title}</Text>
          {meta ? <Text style={styles.metaText} numberOfLines={1}>{meta}</Text> : null}
          <View style={styles.nameRow}>
            <Icon name="bookmark" size={BOOKMARK_ICON} color={colors.accent} weight="fill" />
            <Text style={styles.bookmarkName}>{count}</Text>
          </View>
        </View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} style={styles.toggle} />
      </TouchableOpacity>

      {expanded && bookmarks.map(b => (
        <BookmarkRow key={b.id} bookmark={b} story={story} onPlay={onPlay} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </View>
  );
}

// A bookmark inside an opened group (the story is shown once, above).
const BookmarkRow = ({ bookmark, story, onPlay, onEdit, onDelete }:
  { bookmark: any; story: any; onPlay: CommonProps['onPlay']; onEdit: CommonProps['onEdit']; onDelete: CommonProps['onDelete'] }) => {
  const actions = useActions(bookmark, onEdit, onDelete);
  const name = bookmark.name || 'My Bookmark';
  return (
    <SwipeActionRow actions={actions}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPlay(story, bookmark.positionSeconds)}
        style={styles.childRow}
        accessibilityRole="button"
        accessibilityLabel={`${name}, at ${formatPosition(bookmark.positionSeconds)} in ${story.title}`}
        accessibilityHint="Plays from this bookmark"
        accessibilityActions={[{ name: 'delete', label: 'Delete bookmark' }, { name: 'edit', label: 'Rename bookmark' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'delete') onDelete(bookmark);
          if (e.nativeEvent.actionName === 'edit') onEdit(bookmark);
        }}
      >
        <View style={styles.nameRow}>
          <Icon name="bookmark" size={BOOKMARK_ICON} color={colors.accent} weight="fill" />
          <Text style={styles.bookmarkName} numberOfLines={1}>{name}</Text>
        </View>
        <Text style={styles.position}>{formatPosition(bookmark.positionSeconds)}</Text>
      </TouchableOpacity>
    </SwipeActionRow>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.margin,
    paddingRight: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    gap: 12,
    backgroundColor: colors.surface0,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
    flexShrink: 0,
  },
  content: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  bookmarkName: { fontSize: fontSizes.small, fontWeight: '600', color: colors.accent, flexShrink: 1 },
  storyTitle: { fontSize: fontSizes.small, fontWeight: '700', color: colors.textPrimary, lineHeight: 18 },
  metaText: { fontSize: fontSizes.caption, color: colors.textSecondary },
  position: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  toggle: { marginRight: 4 },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // lines up under the story text: gutter + artwork + gap
    paddingLeft: spacing.margin + 64 + 12,
    paddingRight: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.surface0,
    gap: 12,
  },
});
