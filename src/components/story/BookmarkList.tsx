import React, { useMemo, useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text } from '@/components/common/AppText';

import { SkeletonRows } from '../common/Skeleton';

import BookmarkTile, { BookmarkGroup } from './BookmarkTile';
import EditBookmarkSheet from './EditBookmarkSheet';
import EmptyState from '../common/EmptyState';
import { useBookmarks, useDeleteBookmark } from '../../hooks/queries/useBookmarks';
import { useAuthorNames } from '../../hooks/queries/useAuthorNames';
import { useTagNames } from '../../hooks/queries/useTagNames';
import { usePlayer }       from '../../context/PlayerContext';
import { useStoryImage }   from '../../hooks/queries/useStoryImage';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import Icon from '@/components/common/Icon';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookmarkListProps {
  tabBarHeight: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookmarkList({ tabBarHeight }: BookmarkListProps) {

  const { playTrackAt } = usePlayer();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useBookmarks();

  const items = data?.pages.flatMap(p => p.items) ?? [];

  const { data: authorMap = {} } = useAuthorNames(items.map((i: any) => i.story?.authorId));
  const { data: tagMap = {} } = useTagNames(
    items.flatMap((i: any) => [i.story?.primaryTagId, i.story?.secondaryTagId])
  );

  // One entry per story, newest bookmark first; the bookmarks inside a story run in the order they sit in the audio.
  const groups = useMemo(() => {
    const byStory = new Map<string, { story: any; bookmarks: any[] }>();
    for (const it of items as any[]) {
      let g = byStory.get(it.story.id);
      if (!g) { g = { story: it.story, bookmarks: [] }; byStory.set(it.story.id, g); }
      g.bookmarks.push(it.bookmark);
    }
    return Array.from(byStory.values()).map(g => ({ ...g, bookmarks: [...g.bookmarks].sort((a, b) => a.positionSeconds - b.positionSeconds) }));
  }, [items]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<any | null>(null);
  const { mutate: deleteBookmark } = useDeleteBookmark();

  const confirmDelete = (bookmark: any) => {
    Alert.alert('Delete Bookmark', `Delete "${bookmark.name || 'My Bookmark'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBookmark(bookmark.id) },
    ]);
  };

  const handlePlay = (story: any, positionSeconds: number) => {
    playTrackAt(
      {
        id:      story.id,
        title:   story.title ?? '',
        url:     story.audioUri ?? '',
        artwork: story.imageUri ?? '',
        artist:  authorMap[story.authorId ?? ''] ?? '',
      },
      positionSeconds
    );
  };

  if (isLoading) return <SkeletonRows count={6} />;

  return (
    <>
    <FlatList
      data={groups}
      keyExtractor={g => g.story.id}
      extraData={expanded}
      renderItem={({ item: g }) => g.bookmarks.length === 1 ? (
        <BookmarkTile
          bookmark={g.bookmarks[0]}
          story={g.story}
          authorMap={authorMap}
          tagMap={tagMap}
          onPlay={handlePlay}
          onEdit={setEditing}
          onDelete={confirmDelete}
        />
      ) : (
        <BookmarkGroup
          bookmarks={g.bookmarks}
          expanded={!!expanded[g.story.id]}
          onToggle={() => setExpanded(e => ({ ...e, [g.story.id]: !e[g.story.id] }))}
          story={g.story}
          authorMap={authorMap}
          tagMap={tagMap}
          onPlay={handlePlay}
          onEdit={setEditing}
          onDelete={confirmDelete}
        />
      )}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
      }
      ListFooterComponent={
        isFetchingNextPage
          ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} />
          : null
      }
      ListEmptyComponent={
        <EmptyState
          icon={<Icon name="bookmark" size={40} color={colors.textSecondary} />}
          title="Save your place"
          body="While a story plays, tap the bookmark icon to mark a moment. Come back here to jump straight to it."
        />
      }
    />
    <EditBookmarkSheet bookmark={editing} onClose={() => setEditing(null)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: fontSizes.subtitle,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptySub: {
    fontSize: fontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});