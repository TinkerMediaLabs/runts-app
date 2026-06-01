import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuHeader from '../../components/common/MenuHeader';
import Screen from '../../components/common/Screen';
import AuthorTile from '../../components/story/AuthorTile';
import { useFollowedAuthors } from '../../hooks/queries/useAuthorFollowing';
import { useTags } from '../../hooks/queries/useTags';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import { useStories } from '../../hooks/queries/useStories';

export default function AuthorFollowingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

    const { data: allStories } = useStories();

    const storyStatsByAuthor = useMemo(() => {
    if (!allStories) return {};
    return allStories.reduce((acc: Record<string, { count: number; listens: number }>, story) => {
        if (!story.authorId) return acc;
        if (!acc[story.authorId]) acc[story.authorId] = { count: 0, listens: 0 };
        acc[story.authorId].count += 1;
        acc[story.authorId].listens += story.numListens ?? 0;
        return acc;
    }, {});
    }, [allStories]);

  const { data: tags } = useTags();

  const tagMap = useMemo(() => {
    if (!tags) return {};
    return tags.reduce((acc: Record<string, string>, tag) => {
      if (tag.id && tag.name) acc[tag.id] = tag.name;
      return acc;
    }, {});
  }, [tags]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useFollowedAuthors();

  const items = data?.pages.flatMap(p => p.items) ?? [];

  const renderItem = ({ item }: any) => {
  const stats = storyStatsByAuthor[item.author?.id] ?? { count: 0, listens: 0 };
  return (
    <AuthorTile
      author={item.author}
      followRecordId={item.followRecord.id}
      tagMap={tagMap}
      storyCount={stats.count}
      totalListens={stats.listens}
    />
  );
};

  return (
    <Screen>
      <MenuHeader title="Following" navigation={navigation} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="cyan" />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={item => item.followRecord.id}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color="cyan" style={{ marginVertical: 20 }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <FontAwesome5 name="user-friends" size={36} color="#ffffff20" iconStyle="solid" />
              <Text style={styles.emptyTitle}>Not following anyone yet</Text>
              <Text style={styles.emptySub}>
                Follow authors from their profile page to see them here.
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

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