import React, { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { Text } from '@/components/common/AppText';

import { useFocusEffect } from '@react-navigation/native';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import StoryTile from './StoryTile';
import EmptyState from '../common/EmptyState';
import { navigate } from '@/navigation/RootNavigator';
import {
  useFavoritedStories,
  getFavoriteThreshold,
  DEFAULT_THRESHOLD,
} from '../../hooks/queries/useFavoritedStories';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useAuthorNames } from '../../hooks/queries/useAuthorNames';
import { useTagNames }    from '../../hooks/queries/useTagNames';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

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
        secondaryTag={tagMap[story.secondaryTagId ?? ''] ?? ''}
        audioUri={story.audioUri ?? ''}
        summary={story.summary ?? ''}
        author={authorMap[story.authorId ?? ''] ?? ''}
        description={story.description ?? ''}
        duration={story.duration ?? 0}
        numListens={story.numListens ?? 0}
        licenseType={story.licenseType}
        universeId={story.universeId}
        sequenceNumber={story.sequenceNumber}
      />
      {/* Rating badge */}
      <View style={styles.ratingBadge}>
        <FontAwesome5 name="star" size={iconSize.xs} color={colors.gold} iconStyle="solid" />
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



  // Re-read threshold whenever the tab comes into focus
  // (user may have changed it in settings)
  useFocusEffect(
    useCallback(() => {
      getFavoriteThreshold().then(setThreshold);
    }, [])
  );

  const {
    data,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFavoritedStories(threshold);

  const stories = React.useMemo(() => data?.pages.flatMap(p => p.items) ?? [], [data]);

  // A page can come back short (e.g. erotic favorites hidden) - keep pulling until the list can scroll.
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && stories.length < 10) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, stories.length, fetchNextPage]);

  const { data: authorMap = {} } = useAuthorNames(stories.map((s: any) => s.authorId));

  const allTagIds = React.useMemo(() => {
    if (!stories) return [];
    return stories.flatMap((s: any) => [s.primaryTagId, s.secondaryTagId]);
}, [stories]);

const { data: tagMap = {} } = useTagNames(allTagIds);

  const onRefresh = async () => {
    setIsFetching(true);
    await refetch();
    setIsFetching(false);
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
      data={stories}
      onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} /> : null}
    keyExtractor={item => item.id ?? item.userRating.toString()}      renderItem={({ item }) => (
        <FavoriteStoryRow story={item} authorMap={authorMap} tagMap={tagMap} />
      )}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={colors.accent} />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
      ListEmptyComponent={
        <EmptyState
          icon={<FontAwesome5 name="star" size={40} color={colors.textSecondary} iconStyle="regular" />}
          title="Your favorites will live here"
          body={`Rate a story ${threshold} stars or higher after you listen and it shows up here, so your best ones are easy to find again.`}
          actionLabel="Find a story"
          onAction={() => navigate('SearchScreen')}
        />
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
    fontSize: fontSizes.caption,
    color: colors.gold,
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