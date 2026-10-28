import React, { useMemo, useRef, useCallback } from 'react';
import { View, SectionList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Screen from '@/components/common/Screen';
import ScreenHeader from '@/components/common/ScreenHeader';
import { spacing } from '../../theme/spacing';
import { useSubgenreIndex } from '../../hooks/queries/useDiscover';
import { groupByLetter, type ListedTag } from '../../lib/discoverTags';
import { Analytics } from '@/lib/analytics';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';

// Every subgenre that has live stories, in alphabetical sections with a letter strip down the side. Loads more as
// you scroll; tapping a letter jumps to it when that part of the list is loaded.
const AllSubgenresScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const listRef = useRef<SectionList<ListedTag>>(null);
  const q = useSubgenreIndex();

  const items = useMemo(() => (q.data?.pages ?? []).flatMap(p => p.items), [q.data]);
  const sections = useMemo(() => groupByLetter(items).map(s => ({ title: s.letter, data: s.data })), [items]);
  const letters = useMemo(() => sections.map(s => s.title), [sections]);

  const jump = useCallback((i: number) => {
    try { listRef.current?.scrollToLocation({ sectionIndex: i, itemIndex: 0, animated: false, viewOffset: 0 }); } catch { /* not loaded yet */ }
  }, []);

  const renderItem = useCallback(({ item }: { item: ListedTag }) => (
    <TouchableOpacity
      activeOpacity={0.7} style={styles.row}
      onPress={() => { Analytics.genreTapped(item.id, item.name); navigation.navigate('TagHomeScreen', { id: item.id, name: item.name }); }}
      accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.liveCount} ${item.liveCount === 1 ? 'story' : 'stories'}`}
    >
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.count}>{item.liveCount}</Text>
    </TouchableOpacity>
  ), [navigation]);

  return (
    <Screen>
      <View style={{ flex: 1, backgroundColor: colors.surface0 }}>
        <ScreenHeader title="All subgenres" />

        {q.isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
        ) : items.length === 0 ? (
          <View style={styles.center}><Text style={styles.empty}>No subgenres yet</Text></View>
        ) : (
          <View style={{ flex: 1 }}>
            <SectionList
              ref={listRef}
              sections={sections}
              keyExtractor={t => t.id}
              renderItem={renderItem}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader} accessible accessibilityRole="header" accessibilityLabel={`Section ${section.title}`}><Text style={styles.sectionLetter}>{section.title}</Text></View>
              )}
              stickySectionHeadersEnabled
              onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }}
              onEndReachedThreshold={0.6}
              onScrollToIndexFailed={() => {}}
              ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ margin: 20 }} /> : <View style={{ height: 40 }} />}
              contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingRight: 28 }}
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.strip} pointerEvents="box-none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {letters.map((l, i) => (
                <TouchableOpacity key={l} onPress={() => jump(i)} hitSlop={{ left: 14, right: 10 }}
                  accessibilityRole="button" accessibilityLabel={`Jump to ${l}`}>
                  <Text style={styles.stripLetter}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.textSecondary, fontSize: fontSizes.body },
  sectionHeader: { backgroundColor: colors.surface0, paddingHorizontal: spacing.margin, paddingVertical: 6 },
  sectionLetter: { color: colors.accent, fontSize: fontSizes.small, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13, minHeight: 48, paddingHorizontal: spacing.margin,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle,
  },
  name: { flex: 1, color: colors.textPrimary, fontSize: fontSizes.body },
  count: { color: colors.textTertiary, fontSize: fontSizes.small, marginLeft: 12 },
  strip: { position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', width: 24 },
  stripLetter: { color: colors.accent, fontSize: fontSizes.micro, fontWeight: '700', paddingVertical: 1.5, paddingHorizontal: 4 },  // hidden from screen readers: sections have headers
});

export default AllSubgenresScreen;
