import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import FontAwesome from '@react-native-vector-icons/fontawesome';

import StoryTile from './StoryTile';
import {
  useFavoritedStories,
  getFavoriteThreshold,
  DEFAULT_THRESHOLD,
} from '../../hooks/queries/useFavoritedStories';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useAuthors } from '../../hooks/queries/useAuthors';
import { useTags }    from '../../hooks/queries/useTags';

// ---------------------------------------------------------------------------
// Story row — resolves S3 image before rendering
// ---------------------------------------------------------------------------

const FavoriteStoryRow = ({ story, authorMap, tagMap }: any) => {
  const { data: resolvedImageUri } = useStoryImage(
    story?.imageUri?.startsWith('stories/') ? story.imageUri : null
  );
  const displayImageUri = resolvedImageUri ?? story?.imageUri ?? '';

  return (
    <View>
      <StoryTile
        id={story.id}
        title={story.title}
        imageUri={displayImageUri}
        primaryTag={tagMap[story.primaryTagId ?? ''] ?? ''}
        audioUri={story.audioUri ?? ''}
        summary={story.summary ?? ''}
        author={authorMap[story.authorId ?? ''] ?? ''}
        description={story.description ?? ''}
        duration={story.duration ?? 0}
        numListens={story.numListens ?? 0}
      />
      {/* Rating badge */}
      <View style={styles.ratingBadge}>
        <FontAwesome name="star" size={11} color="#C9A84C" />
        <Text style={styles.ratingText}>{story.userRating} / 10</Text>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main list
// ---------------------------------------------------------------------------

export default function FavoritesList({ tabBarHeight }: { tabBarHeight: number }) {
  const [threshold,   setThreshold]   = useState(DEFAULT_THRESHOLD);
  const [isFetching,  setIsFetching]  = useState(false);

  const { data: authors } = useAuthors();
  const { data: tags }    = useTags();

  const authorMap = React.useMemo(() => {
    if (!authors) return {};
    return authors.reduce((acc: Record<string, string>, a) => {
      if (a.id && a.name) acc[a.id] = a.name;
      return acc;
    }, {});
  }, [authors]);

  const tagMap = React.useMemo(() => {
    if (!tags) return {};
    return tags.reduce((acc: Record<string, string>, t) => {
      if (t.id && t.name) acc[t.id] = t.name;
      return acc;
    }, {});
  }, [tags]);

  // Re-read threshold whenever the tab comes into focus
  // (user may have changed it in settings)
  useFocusEffect(
    useCallback(() => {
      getFavoriteThreshold().then(setThreshold);
    }, [])
  );

  const {
    data: stories,
    isLoading,
    refetch,
  } = useFavoritedStories(threshold);

  const onRefresh = async () => {
    setIsFetching(true);
    await refetch();
    setIsFetching(false);
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
      data={stories ?? []}
    keyExtractor={item => item.id ?? item.userRating.toString()}      renderItem={({ item }) => (
        <FavoriteStoryRow story={item} authorMap={authorMap} tagMap={tagMap} />
      )}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor="cyan" />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <FontAwesome name="star-o" size={36} color="#ffffff20" />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySub}>
            Stories you rate {threshold} stars or higher will appear here.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 24,
    marginTop: -2,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#C9A84C',
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 80,
    gap: 10,
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