import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@react-native-vector-icons/ant-design';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import ForYouCarousel from '@/components/story/ForYouCarousel';
import HorizontalList from '@/components/story/HorizontalList';
import EroticContinueListening from '@/components/erotic/EroticContinueListening';

import { useEroticStories } from '@/hooks/queries/useEroticStories';
import { useTags, usePrimaryTags } from '@/hooks/queries/useTags';
import { useAuthors } from '@/hooks/queries/useAuthors';
import { useTagNames } from '@/hooks/queries/useTagNames';
import { useStoryProgressMap } from '@/hooks/queries/useStoryProgressMap';
import { useNarrators } from '@/hooks/queries/useNarrators';
import { useStoryNarratorLinks } from '@/hooks/queries/useStoryNarratorLinks';
import { isRecentlyPublished, formatNarratorDisplay } from '@/lib/storyDisplay';

const EROTIC_ORANGE = '#ff7c2a';
const HEADER_MAX_HEIGHT = 56;
const HEADER_MIN_HEIGHT = 40;
const HEADER_SCROLL_DISTANCE = 60;

type TabId = 'foryou' | 'genres';

// ---------------------------------------------------------------------------
// GenreGridTile — 2-column primary genre tile
// ---------------------------------------------------------------------------

const GenreGridTile = ({ tag, navigation }: { tag: any; navigation: any }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => navigation.navigate('TagHomeScreen', { id: tag.id, name: tag.name })}
    style={styles.genreGridTile}
  >
    <Text style={styles.genreGridTileName} numberOfLines={1}>{tag.name}</Text>
    <Text style={styles.genreGridTileCount}>
      {tag.storyCount ?? 0} {(tag.storyCount ?? 0) === 1 ? 'story' : 'stories'}
    </Text>
  </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// TagPill — small alphabetical additional-tag item
// ---------------------------------------------------------------------------

const TagPill = ({ tag, navigation }: { tag: any; navigation: any }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={() => navigation.navigate('TagHomeScreen', { id: tag.id, name: tag.name })}
    style={styles.tagPill}
  >
    <Text style={styles.tagPillText}>{tag.name}</Text>
  </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const EroticHomeScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabId>('foryou');
  const scrollY = useSharedValue(0);

  const handleTabPress = (tab: TabId) => {
    scrollY.value = 0;
    setActiveTab(tab);
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: eroticStories } = useEroticStories();
  const { data: allTags } = useTags();
  const { data: primaryTags } = usePrimaryTags();
  const { data: authors } = useAuthors();

  const authorMap = useMemo(() => {
    if (!authors) return {};
    return authors.reduce((acc: Record<string, string>, a: any) => {
      if (a.id && a.name) acc[a.id] = a.name;
      return acc;
    }, {});
  }, [authors]);

  const allTagIds = useMemo(() => {
    if (!eroticStories) return [];
    return eroticStories.flatMap((s: any) => [s.primaryTagId, s.secondaryTagId]);
  }, [eroticStories]);

  const { data: tagMap = {} } = useTagNames(allTagIds);

  const progressMap = useStoryProgressMap();
  const { data: narrators = [] } = useNarrators();
  const { data: storyNarratorLinks = [] } = useStoryNarratorLinks();

  const narratorNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    narrators.forEach((n: any) => {
      if (n.id && n.name) m[n.id] = n.name;
    });
    return m;
  }, [narrators]);

  const storyNarratorsMap = useMemo(() => {
    const m: Record<string, string[]> = {};
    storyNarratorLinks.forEach((link: any) => {
      if (!link.storyId || !link.narratorId) return;
      const name = narratorNameMap[link.narratorId];
      if (!name) return;
      if (!m[link.storyId]) m[link.storyId] = [];
      m[link.storyId].push(name);
    });
    return m;
  }, [storyNarratorLinks, narratorNameMap]);

  const enrichedStories = useMemo(() => {
    if (!eroticStories) return [];
    return eroticStories
      .filter((s: any) => !!s.id)
      .map((s: any) => {
        const progress = progressMap[s.id];
        return {
          ...s,
          primaryTagName:   s.primaryTagId   ? tagMap[s.primaryTagId]   ?? '' : '',
          secondaryTagName: s.secondaryTagId ? tagMap[s.secondaryTagId] ?? '' : '',
          authorName:       s.authorId       ? authorMap[s.authorId]    ?? '' : '',
          narratorDisplay:  formatNarratorDisplay(storyNarratorsMap[s.id]),
          isNew:            isRecentlyPublished(s.publishedAt),
          progressStatus:   progress?.status ?? 'none',
          progressSeconds:  progress?.progressSeconds ?? 0,
        };
      });
  }, [eroticStories, tagMap, authorMap, storyNarratorsMap, progressMap]);

  // "New" — already sorted newest-first by the underlying GSI query
  const newStories = useMemo(() => enrichedStories.slice(0, 10), [enrichedStories]);

  // "Trending" — highest listens, matching the app-wide trending convention
  const trendingStories = useMemo(
    () => [...enrichedStories].sort((a, b) => (b.numListens ?? 0) - (a.numListens ?? 0)).slice(0, 10),
    [enrichedStories]
  );

  // Primary erotic genres — 2-column grid
  const primaryEroticTags = useMemo(
    () => (primaryTags ?? []).filter((t: any) => t.isErotic),
    [primaryTags]
  );

  // Additional (non-primary) erotic tags — alphabetical
  const additionalEroticTags = useMemo(() => {
    return (allTags ?? [])
      .filter((t: any) => t.isErotic && !t.isPrimary)
      .sort((a: any, b: any) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [allTags]);

  // ── Sticky header shrink animation ───────────────────────────────────────
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

const headerTitleStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE],
      [22, 16],
      Extrapolation.CLAMP
    ),
}));

  const headerPaddingStyle = useAnimatedStyle(() => ({
    paddingTop: insets.top + interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE],
      [8, 2],
      Extrapolation.CLAMP
    ),
    paddingBottom: interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE],
      [8, 2],
      Extrapolation.CLAMP
    ),
  }));

    const tabBarStyle = useAnimatedStyle(() => ({
      paddingVertical: interpolate(
        scrollY.value,
        [0, HEADER_SCROLL_DISTANCE],
        [10, 4],
        Extrapolation.CLAMP
      ),
    }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>

      <LinearGradient
        colors={['#0d0400', '#000', '#000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Sticky header — shrinks slightly on scroll */}
      <Animated.View style={[styles.header, headerPaddingStyle]}>          
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <AntDesign name="left" size={20} color="#fff" />
        </TouchableOpacity>

        <Animated.Text style={[styles.headerTitle, headerTitleStyle]}>
          Erotica
        </Animated.Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('BrowseByTitle')}
          style={styles.browseButton}
          activeOpacity={0.7}
        >
          <Text style={styles.browseButtonText}>Browse</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Tab switcher */}
      <Animated.View style={[styles.tabBar, tabBarStyle]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => handleTabPress('foryou')} style={styles.tab}>
          <Text style={[styles.tabLabel, activeTab === 'foryou' && styles.tabLabelActive]}>
            For You
          </Text>
          {activeTab === 'foryou' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => handleTabPress('genres')} style={styles.tab}>
          <Text style={[styles.tabLabel, activeTab === 'genres' && styles.tabLabelActive]}>
            Genres & Tags
          </Text>
          {activeTab === 'genres' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </Animated.View>

      {/* Content */}
      {activeTab === 'foryou' ? (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 100 }}
        >
          <ForYouCarousel stories={enrichedStories} tagMap={tagMap} />

          <View style={{ paddingVertical: 10 }}>
            <EroticContinueListening />
          </View>

          {trendingStories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trending</Text>
              <HorizontalList stories={trendingStories} />
            </View>
          )}

          {newStories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>New</Text>
              <HorizontalList stories={newStories} />
            </View>
          )}
        </Animated.ScrollView>
      ) : (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 100 }}
        >
          {primaryEroticTags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Genres</Text>
              <View style={styles.genreGrid}>
                {primaryEroticTags.map((tag: any) => (
                  <GenreGridTile key={tag.id} tag={tag} navigation={navigation} />
                ))}
              </View>
            </View>
          )}

          {additionalEroticTags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagPillRow}>
                {additionalEroticTags.map((tag: any) => (
                  <TagPill key={tag.id} tag={tag} navigation={navigation} />
                ))}
              </View>
            </View>
          )}
        </Animated.ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  browseButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  browseButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  tabLabelActive: {
    color: EROTIC_ORANGE,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: EROTIC_ORANGE,
    borderRadius: 1,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  genreGridTile: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,124,42,0.25)',
    backgroundColor: 'rgba(255,124,42,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  genreGridTileName: {
    fontSize: 15,
    fontWeight: '700',
    color: EROTIC_ORANGE,
    marginBottom: 4,
  },
  genreGridTileCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  tagPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tagPillText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
});

export default EroticHomeScreen;
