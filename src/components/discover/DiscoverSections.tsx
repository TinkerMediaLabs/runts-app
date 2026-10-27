import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, TouchableOpacity, Animated, AccessibilityInfo, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useNavigation } from '@react-navigation/native';

import SubgenreCard from './SubgenreCard';
import useTypography from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useTagsByIds } from '../../hooks/queries/useTagHome';
import { weightedSample, type ListedTag } from '../../lib/discoverTags';
import { Analytics } from '@/lib/analytics';

const SectionTitle = ({ text, right }: { text: string; right?: React.ReactNode }) => {
  const typo = useTypography();
  return (
    <View style={styles.titleRow}>
      <Text style={[typo.title, { flex: 1 }]} accessibilityRole="header">{text}</Text>
      {right}
    </View>
  );
};

// A horizontal row of subgenre cards. Card pictures are looked up for just these tags (cached for a while).
export const SubgenreRow = ({ title, tags, top = 40 }: { title: string; tags: ListedTag[]; top?: number }) => {
  const ids = useMemo(() => tags.map(t => t.id), [tags]);
  const details = useTagsByIds(ids);
  const imageOf = useMemo(() => {
    const m = new Map<string, string | null>();
    details.forEach((t: any) => m.set(t.id, t.tileImageUri ?? t.imageUri ?? null));
    return m;
  }, [details]);
  const renderItem = useCallback(({ item }: { item: ListedTag }) => (
    <SubgenreCard id={item.id} name={item.name} image={imageOf.get(item.id)} liveCount={item.liveCount} />
  ), [imageOf]);
  if (tags.length === 0) return null;
  return (
    <View style={{ marginTop: top }}>
      <View style={{ marginHorizontal: spacing.margin }}><SectionTitle text={title} /></View>
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={tags} keyExtractor={t => t.id} renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: spacing.margin, gap: 10 }}
      />
    </View>
  );
};

// The shuffle: ten subgenres drawn (favouring bigger ones) from subgenres that have live stories, and a link to the
// full A-Z list.
export const ExploreSubgenres = ({ pool, title }: { pool: ListedTag[]; title: string }) => {
  const navigation = useNavigation<any>();
  const draw = useCallback(() => weightedSample(pool, 10, t => Math.sqrt(Math.max(1, t.liveCount))), [pool]);
  const [visible, setVisible] = useState<ListedTag[]>(draw);
  const [spinning, setSpinning] = useState(false);
  const fade = React.useRef(new Animated.Value(1)).current;
  const spin = React.useRef(new Animated.Value(0)).current;

  useEffect(() => { setVisible(draw()); }, [draw]);

  // Respect the system "reduce motion" setting: swap instantly instead of spinning and fading.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setReduceMotion(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { alive = false; sub.remove(); };
  }, []);

  if (pool.length === 0) return null;

  const shuffle = () => {
    if (spinning) return;
    if (reduceMotion) {
      setVisible(draw());
      AccessibilityInfo.announceForAccessibility('Showing different subgenres');
      return;
    }
    setSpinning(true);
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 400, useNativeDriver: true }).start(() => setSpinning(false));
    Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setVisible(draw());
      AccessibilityInfo.announceForAccessibility('Showing different subgenres');
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ marginTop: 40, marginHorizontal: spacing.margin }}>
      <SectionTitle
        text={title}
        right={
          <TouchableOpacity activeOpacity={0.7} onPress={shuffle} disabled={spinning} style={styles.shuffleBtn}
            accessibilityRole="button" accessibilityLabel="Shuffle subgenres" accessibilityHint="Shows a different set of subgenres">
            <Animated.View style={{ transform: [{ rotate }] }}>
              <FontAwesome5 name={'sync-alt' as any} size={12} color="cyan" iconStyle="solid" />
            </Animated.View>
            <Text style={styles.shuffleText}>Shuffle</Text>
          </TouchableOpacity>
        }
      />
      <Animated.View style={[styles.chipWrap, { opacity: fade }]}>
        {visible.map(tag => (
          <TouchableOpacity key={tag.id} activeOpacity={0.7} style={styles.chip}
            onPress={() => { Analytics.genreTapped(tag.id, tag.name); navigation.navigate('TagHomeScreen', { id: tag.id, name: tag.name }); }}
            accessibilityRole="button" accessibilityLabel={`${tag.name}, subgenre, ${tag.liveCount} ${tag.liveCount === 1 ? 'story' : 'stories'}`}>
            <Text style={styles.chipText}>#{tag.name}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
      <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('AllSubgenres')} style={styles.seeAll}
        accessibilityRole="button" accessibilityLabel="See all subgenres">
        <Text style={styles.seeAllText}>See all subgenres</Text>
        <FontAwesome5 name="chevron-right" size={11} color="cyan" iconStyle="solid" />
      </TouchableOpacity>
    </View>
  );
};

// Ways into the whole catalog.
export const CatalogLinks = ({ title }: { title?: string | null }) => {
  const navigation = useNavigation<any>();
  const rows = [
    { key: 'stories', icon: 'book-open', label: 'All stories', hint: 'A to Z', to: 'BrowseByTitle' },
    { key: 'subgenres', icon: 'tags', label: 'All subgenres', hint: 'A to Z', to: 'AllSubgenres' },
  ];
  return (
    <View style={{ marginTop: 40, marginHorizontal: spacing.margin }}>
      <SectionTitle text={title || 'Browse the catalog'} />
      {rows.map(r => (
        <TouchableOpacity key={r.key} activeOpacity={0.8} onPress={() => navigation.navigate(r.to)} style={styles.linkRow}
          accessibilityRole="button" accessibilityLabel={`${r.label}, ${r.hint}`}>
          <FontAwesome5 name={r.icon as any} size={16} color="cyan" iconStyle="solid" />
          <Text style={styles.linkLabel}>{r.label}</Text>
          <Text style={styles.linkHint}>{r.hint}</Text>
          <FontAwesome5 name="chevron-right" size={12} color="rgba(255,255,255,0.4)" iconStyle="solid" />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  shuffleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 22, minHeight: 44,
    backgroundColor: 'rgba(0,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,255,255,0.25)',
  },
  shuffleText: { fontSize: 12, fontWeight: '600', color: 'cyan' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 22, minHeight: 44, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)',
  },
  chipText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 8, minHeight: 44 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: 'cyan' },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 14, marginBottom: 8,
    borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)',
  },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  linkHint: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
});
