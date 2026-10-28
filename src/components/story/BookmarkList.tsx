import React, { useMemo } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { Text } from '@/components/common/AppText';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import BookmarkTile        from './BookmarkTile';
import EmptyState from '../common/EmptyState';
import { useBookmarks }    from '../../hooks/queries/useBookmarks';
import { useAuthorNames } from '../../hooks/queries/useAuthorNames';
import { useTagNames } from '../../hooks/queries/useTagNames';
import { usePlayer }       from '../../context/PlayerContext';
import { useStoryImage }   from '../../hooks/queries/useStoryImage';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';

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

  const handlePlay = (storyId: string, positionSeconds: number) => {
    // Find the story from our loaded items
    const item = items.find(i => i.story?.id === storyId);
    if (!item?.story) return;
    const story = item.story;

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

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={item => item.bookmark.id}
      renderItem={({ item }) => (
        <BookmarkTile
          bookmark={item.bookmark}
          story={item.story}
          authorMap={authorMap}
          tagMap={tagMap}
          onPlay={handlePlay}
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
          icon={<FontAwesome5 name={'bookmark' as any} size={40} color={colors.textSecondary} iconStyle="solid" />}
          title="Save your place"
          body="While a story plays, tap the bookmark icon to mark a moment. Come back here to jump straight to it."
        />
      }
    />
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