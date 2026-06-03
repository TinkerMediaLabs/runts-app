import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import BookmarkTile        from './BookmarkTile';
import { useBookmarks }    from '../../hooks/queries/useBookmarks';
import { useAuthors }      from '../../hooks/queries/useAuthors';
import { useTags }         from '../../hooks/queries/useTags';
import { usePlayer }       from '../../context/PlayerContext';
import { useStoryImage }   from '../../hooks/queries/useStoryImage';

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

  const { data: authors } = useAuthors();
  const { data: tags }    = useTags();

  const authorMap = useMemo(() => {
    if (!authors) return {};
    return authors.reduce((acc: Record<string, string>, a) => {
      if (a.id && a.name) acc[a.id] = a.name;
      return acc;
    }, {});
  }, [authors]);

  const tagMap = useMemo(() => {
    if (!tags) return {};
    return tags.reduce((acc: Record<string, string>, t) => {
      if (t.id && t.name) acc[t.id] = t.name;
      return acc;
    }, {});
  }, [tags]);

  const items = data?.pages.flatMap(p => p.items) ?? [];

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
        <ActivityIndicator color="cyan" />
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
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="cyan" />
      }
      ListFooterComponent={
        isFetchingNextPage
          ? <ActivityIndicator color="cyan" style={{ marginVertical: 20 }} />
          : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <FontAwesome5 name={'bookmark' as any} size={36} color="#ffffff20" iconStyle="solid" />
          <Text style={styles.emptyTitle}>No bookmarks yet</Text>
          <Text style={styles.emptySub}>
            Tap the bookmark icon while listening to save your place in a story.
          </Text>
        </View>
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
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff60',
  },
  emptySub: {
    fontSize: 14,
    color: '#ffffff30',
    textAlign: 'center',
    lineHeight: 20,
  },
});