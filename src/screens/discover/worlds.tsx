import React, { useMemo } from 'react';
import { View, FlatList, Dimensions, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Screen from '@/components/common/Screen';
import ScreenHeader from '@/components/common/ScreenHeader';
import EmptyState from '../../components/common/EmptyState';
import { Text } from '@/components/common/AppText';
import Icon from '@/components/common/Icon';
import { SkeletonRows } from '../../components/common/Skeleton';
import WorldCard from '../../components/discover/WorldCard';
import { useAllWorlds } from '../../hooks/queries/useWorlds';
import type { World } from '../../lib/worlds';
import { colors } from '@/theme/colors';
import { fontSizes, layout } from '@/theme/tokens';

// The Worlds page: the mini home of World Building. A short invitation, then every world as a large card,
// loading more as you scroll. Opening a world goes to its own page (the same screen genres use).
const WorldsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const q = useAllWorlds();
  const worlds = useMemo(() => (q.data?.pages ?? []).flatMap(p => p.items) as World[], [q.data]);
  const cardW = Dimensions.get('window').width - layout.gutter * 2;

  const Header = (
    <View style={styles.intro}>
      <Text style={styles.tagline}>BUILDING WORLDS THROUGH STORIES</Text>
      <Text style={styles.blurb}>
        Some stories share a universe: the same places, rules and history, told from different corners. Step into a world and
        follow it from one story to the next.
      </Text>
    </View>
  );

  return (
    <Screen gradient>
      <ScreenHeader title="World Building" />
      {q.isLoading ? (
        <SkeletonRows count={4} />
      ) : (
        <FlatList
          data={worlds}
          keyExtractor={w => w.id}
          renderItem={({ item }) => (
            <View style={{ marginHorizontal: layout.gutter, marginBottom: 18 }}>
              <WorldCard world={item} width={cardW} height={Math.round(cardW * 0.9)}
                onPress={() => navigation.navigate('TagHomeScreen', { id: item.id, name: item.name })} />
            </View>
          )}
          ListHeaderComponent={Header}
          ListEmptyComponent={
            <EmptyState
              icon={<Icon name="globe" size={40} color={colors.textSecondary} />}
              title="More worlds are on the way"
              body="Check back soon."
            />
          }
          ListFooterComponent={q.isFetchingNextPage ? <View style={{ paddingVertical: 24 }}><ActivityIndicator color={colors.accent} /></View> : <View style={{ height: 24 }} />}
          onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  intro: { marginHorizontal: layout.gutter, marginTop: 8, marginBottom: 20, gap: 8 },
  tagline: { color: colors.accent, fontSize: fontSizes.caption, fontWeight: '800', letterSpacing: 1.6 },
  blurb: { color: colors.textStrong, fontSize: fontSizes.small, lineHeight: 21 },
});

export default WorldsScreen;
