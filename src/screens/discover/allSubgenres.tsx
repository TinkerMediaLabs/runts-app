import React, { useMemo, useRef, useCallback } from 'react';
import { View, SectionList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Screen from '@/components/common/Screen';
import useTypography from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useSubgenreIndex } from '../../hooks/queries/useDiscover';
import { groupByLetter, type ListedTag } from '../../lib/discoverTags';
import { Analytics } from '@/lib/analytics';

// Every subgenre that has live stories, in alphabetical sections with a letter strip down the side. Loads more as
// you scroll; tapping a letter jumps to it when that part of the list is loaded.
const AllSubgenresScreen = () => {
  const navigation = useNavigation<any>();
  const typo = useTypography();
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
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} onPress={() => navigation.goBack()}
            accessibilityRole="button" accessibilityLabel="Go back" style={styles.back} activeOpacity={0.7}>
            <FontAwesome5 name="chevron-left" size={18} color="#fff" iconStyle="solid" />
          </TouchableOpacity>
          <Text style={typo.title} accessibilityRole="header">All subgenres</Text>
        </View>

        {q.isLoading ? (
          <View style={styles.center}><ActivityIndicator color="cyan" /></View>
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
              ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color="cyan" style={{ margin: 20 }} /> : <View style={{ height: 40 }} />}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: spacing.margin, paddingBottom: 12 },
  back: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  sectionHeader: { backgroundColor: '#000', paddingHorizontal: spacing.margin, paddingVertical: 6 },
  sectionLetter: { color: 'cyan', fontSize: 14, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13, minHeight: 48, paddingHorizontal: spacing.margin,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  name: { flex: 1, color: '#fff', fontSize: 16 },
  count: { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginLeft: 12 },
  strip: { position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', width: 24 },
  stripLetter: { color: 'cyan', fontSize: 11, fontWeight: '700', paddingVertical: 1.5, paddingHorizontal: 4 },  // hidden from screen readers: sections have headers
});

export default AllSubgenresScreen;
