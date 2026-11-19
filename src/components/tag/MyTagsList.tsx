import React from 'react';
import { FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SkeletonRows } from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import FollowedTagTile from './FollowedTagTile';
import { useFollowedTags } from '../../hooks/queries/useTagFollowing';
import { navigate } from '@/navigation/RootNavigator';
import { hasNewStories } from '../../lib/newStories';
import { colors } from '@/theme/colors';
import Icon from '@/components/common/Icon';

// The genres the listener follows, newest follow first, 30 per page. See useFollowedTags for why this stays the
// same cost however many genres are followed.
export default function MyTagsList({ tabBarHeight }: { tabBarHeight: number }) {
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useFollowedTags();
  const items = React.useMemo(() => data?.pages.flatMap(p => p.items) ?? [], [data]);

  // A page can come back short when erotic genres are hidden: keep pulling until the list can scroll.
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && items.length < 6) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, items.length, fetchNextPage]);

  if (isLoading) return <SkeletonRows count={4} />;

  return (
    <FlatList
      data={items}
      keyExtractor={item => item.tag.id}
      renderItem={({ item }) => (
        <FollowedTagTile
          tag={item.tag}
          hasNew={hasNewStories(item.tag?.latestStoryAt, item.followRecord?.lastSeenAt, item.followRecord?.followedAt)}
        />
      )}
      onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
      onEndReachedThreshold={1.5}
      initialNumToRender={8}
      windowSize={7}
      maxToRenderPerBatch={8}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={() => { refetch(); }} tintColor={colors.accent} />}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} /> : null}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
      ListEmptyComponent={
        <EmptyState
          icon={<Icon name="tags" size={40} color={colors.textSecondary} />}
          title="Follow the genres you love"
          body="Tap Follow on any genre page and it shows up here. You can choose which ones send you a note when a new story arrives."
          actionLabel="Find a genre"
          onAction={() => navigate('Browse')}
        />
      }
    />
  );
}
