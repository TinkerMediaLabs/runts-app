import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  InteractionManager,
} from 'react-native';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import FontAwesome  from '@react-native-vector-icons/fontawesome';

import Screen      from '@/components/common/Screen';
import StoryTile   from '../../components/story/StoryTile';
import SearchInput from '../../components/common/SearchInput';

import { useStoryImage }  from '../../hooks/queries/useStoryImage';
import { useAuthors }     from '../../hooks/queries/useAuthors';
import { usePrimaryTags } from '../../hooks/queries/useTags';
import {
  useSearchStories,
  useSearchAuthors,
  useSearchTags,
  type SortOption,
  type DurationFilter,
} from '../../hooks/queries/useSearch';

import { Analytics } from '@/lib/analytics';

import { spacing } from '@/theme/spacing';

const { width } = Dimensions.get('window');

import { useApp } from '@/context/AppContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TabId = 'stories' | 'authors' | 'tags';

// icon typed as any to bypass FontAwesome5's strict union type
const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'stories', label: 'Stories', icon: 'headphones' },
  { id: 'authors', label: 'Authors', icon: 'user-edit'  },
  { id: 'tags',    label: 'Genres',  icon: 'tag'        },
];
const TAB_WIDTH = width / TABS.length;

const SORT_OPTIONS: { value: SortOption; label: string; icon: any }[] = [
  { value: 'newest',   label: 'Newest First',   icon: 'clock' },
  { value: 'popular',  label: 'Most Popular',   icon: 'fire'  },
  { value: 'shortest', label: 'Shortest First', icon: 'bolt'  },
];

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: 'any',    label: 'Any Length' },
  { value: 'short',  label: 'Under 15m'  },
  { value: 'medium', label: '15–30m'     },
  { value: 'long',   label: 'Over 30m'   },
];

const DEBOUNCE_MS = 300;
const SCRUNCH_END = 60; // scrollY value at which scrunch is complete

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<any>);

// ---------------------------------------------------------------------------
// SearchStoryItem
// ---------------------------------------------------------------------------

const SearchStoryItem = React.memo(({
  item,
  authorMap,
  tagMap,
}: {
  item: any;
  authorMap: Record<string, string>;
  tagMap: Record<string, string>;
}) => {
  const { data: resolvedImageUri } = useStoryImage(
    item?.imageUri?.startsWith('stories/') ? item.imageUri : null
  );
  const displayImageUri = resolvedImageUri ?? item?.imageUri ?? '';

  return (
    <StoryTile
      id={item.id}
      title={item.title}
      imageUri={displayImageUri}
      primaryTag={tagMap[item.primaryTagId ?? ''] ?? ''}
      audioUri={item.audioUri ?? ''}
      summary={item.summary ?? ''}
      author={authorMap[item.authorId ?? ''] ?? ''}
      description={item.description ?? ''}
      duration={item.duration ?? 0}
      numListens={item.numListens ?? 0}
    />
  );
});

// ---------------------------------------------------------------------------
// SearchAuthorItem
// ---------------------------------------------------------------------------

const SearchAuthorItem = React.memo(({
  item,
  navigation,
}: {
  item: any;
  navigation: any;
}) => (
  <TouchableOpacity
    activeOpacity={0.75}
    onPress={() => navigation.navigate('AuthorDetails', { id: item.id })}
    style={styles.authorItem}
  >
    <Image
      source={
        item.profilePicUri
          ? { uri: item.profilePicUri }
          : require('../../../assets/images/blankprofile.png')
      }
      style={styles.authorAvatar}
    />
    <View style={styles.authorInfo}>
      <Text style={styles.authorName} numberOfLines={1}>{item.name}</Text>
      {item.bio ? (
        <Text style={styles.authorBio} numberOfLines={2}>{item.bio}</Text>
      ) : null}
    </View>
    <FontAwesome5
      name={'chevron-right' as any}
      size={12}
      color="rgba(255,255,255,0.25)"
      iconStyle="solid"
    />
  </TouchableOpacity>
));

// ---------------------------------------------------------------------------
// FilterChip
// ---------------------------------------------------------------------------

const FilterChip = ({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: any;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[styles.filterChip, active && styles.filterChipActive]}
  >
    {icon ? (
      <FontAwesome5
        name={icon}
        size={10}
        color={active ? '#000' : 'rgba(255,255,255,0.5)'}
        iconStyle="solid"
        style={{ marginRight: 5 }}
      />
    ) : null}
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// SortSheet
// ---------------------------------------------------------------------------

const SortSheet = ({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: SortOption;
  onSelect: (s: SortOption) => void;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.sheetBackdrop} />
      </TouchableWithoutFeedback>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Sort Stories</Text>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.7}
            onPress={() => { onSelect(opt.value); onClose(); }}
            style={styles.sheetOption}
          >
            <View style={styles.sheetOptionLeft}>
              <FontAwesome5
                name={opt.icon}
                size={14}
                color={current === opt.value ? 'cyan' : 'rgba(255,255,255,0.5)'}
                iconStyle="solid"
              />
              <Text style={[
                styles.sheetOptionText,
                current === opt.value && styles.sheetOptionTextActive,
              ]}>
                {opt.label}
              </Text>
            </View>
            {current === opt.value && (
              <FontAwesome name={'check' as any} size={14} color="cyan" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

const EmptyState = ({ icon, title, subtitle }: {
  icon: any;
  title: string;
  subtitle?: string;
}) => (
  <View style={styles.emptyState}>
    <FontAwesome5 name={icon} size={40} color="rgba(255,255,255,0.15)" iconStyle="solid" />
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
  </View>
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

const SearchScreen = ({ navigation }: any) => {

  const insets = useSafeAreaInsets();

  const { eroticEnabled } = useApp();

  // ── Input & debounce ─────────────────────────────────────────────────────
  const [inputValue,     setInputValue]     = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(inputValue.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [inputValue]);

  useEffect(() => {
      if (debouncedQuery.length > 0) {
          const tab = activeTab === 'tags' ? 'genres' : activeTab;
          Analytics.searchPerformed(debouncedQuery, tab);
      }
  }, [debouncedQuery]);

  const inputRef = useRef<any>(null);
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      inputRef.current?.focus();
    });
  }, []);

  // ── Scroll-based scrunch ──────────────────────────────────────────────────
  // Shared scrollY drives all scrunch animations.
  // Reset to 0 on tab change so the bar re-expands.
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Tab icons squish away (height 16→0, opacity 1→0, marginBottom 3→0)
  const tabIconStyle = useAnimatedStyle(() => ({
    height:       interpolate(scrollY.value, [0, SCRUNCH_END], [16, 0],  Extrapolation.CLAMP),
    opacity:      interpolate(scrollY.value, [0, SCRUNCH_END * 0.6], [1, 0], Extrapolation.CLAMP),
    marginBottom: interpolate(scrollY.value, [0, SCRUNCH_END], [3,  0],  Extrapolation.CLAMP),
    overflow: 'hidden',
  }));

  // Filter bar paddingVertical: 10 (=20 total) → 4 (=8 total)
  const filterBarScrollStyle = useAnimatedStyle(() => ({
    paddingVertical: interpolate(
      scrollY.value,
      [0, SCRUNCH_END],
      [10, 4],
      Extrapolation.CLAMP
    ),
  }));

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('stories');
  const tabIndicatorX  = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorX.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleTabPress = useCallback((tab: TabId, index: number) => {
    if (tab === activeTab) return;
    contentOpacity.value = withSequence(
      withTiming(0, { duration: 80  }),
      withTiming(1, { duration: 160 })
    );
    tabIndicatorX.value = withSpring(index * TAB_WIDTH, {
      damping: 22,
      stiffness: 200,
    });
    // Re-expand the scrunch when switching tabs
    scrollY.value = withTiming(0, { duration: 200 });
    setActiveTab(tab);
  }, [activeTab]);

  // Filter bar tab-visibility (hidden on non-stories tabs)
  const filterBarOpacity = useSharedValue(1);
  const filterBarTabStyle = useAnimatedStyle(() => ({
    opacity:   filterBarOpacity.value,
    maxHeight: interpolate(filterBarOpacity.value, [0, 1], [0, 80], Extrapolation.CLAMP),
    overflow: 'hidden',
  }));

  useEffect(() => {
    filterBarOpacity.value = activeTab === 'stories'
      ? withTiming(1, { duration: 200 })
      : withTiming(0, { duration: 150 });
  }, [activeTab]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [sortBy,        setSortBy]        = useState<SortOption>('newest');
  const [duration,      setDuration]      = useState<DurationFilter>('any');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showSortSheet, setShowSortSheet] = useState(false);

  // ── Supporting data ───────────────────────────────────────────────────────
  const { data: authors }     = useAuthors();
  const { data: primaryTags } = usePrimaryTags();

  const authorMap = useMemo(() => {
    if (!authors) return {};
    return authors.reduce((acc: Record<string, string>, a) => {
      if (a.id && a.name) acc[a.id] = a.name;
      return acc;
    }, {});
  }, [authors]);

  const tagMap = useMemo(() => {
    if (!primaryTags) return {};
    return primaryTags.reduce((acc: Record<string, string>, t) => {
      if (t.id && t.name) acc[t.id] = t.name;
      return acc;
    }, {});
  }, [primaryTags]);

  // ── Search queries (lazy per tab) ─────────────────────────────────────────
  const {
    data: storyData,
    isLoading: storiesLoading,
    isFetchingNextPage: storiesFetchingMore,
    fetchNextPage: fetchMoreStories,
    hasNextPage: hasMoreStories,
  } = useSearchStories({
    query:    debouncedQuery,
    sortBy,
    tagId:    selectedTagId,
    duration,
    enabled:  activeTab === 'stories',
  });

  const {
    data: authorResults,
    isLoading: authorsLoading,
  } = useSearchAuthors({
    query:   debouncedQuery,
    enabled: activeTab === 'authors',
  });

  const {
    data: tagResults,
    isLoading: tagsLoading,
  } = useSearchTags({
    query:   debouncedQuery,
    enabled: activeTab === 'tags',
  });

  const storyItems = useMemo(() => {
    const all = storyData?.pages.flatMap(p => p.items) ?? [];
    // Filter erotic stories from search results when erotic is disabled
    if (eroticEnabled) return all;
    return all.filter((s: any) => s.isErotic !== 'true');
}, [storyData, eroticEnabled]);

  const filteredTagResults = useMemo(() => {
      return (tagResults ?? []).filter((t: any) => !t.isErotic);
  }, [tagResults]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderStory = useCallback(({ item }: any) => (
    <SearchStoryItem item={item} authorMap={authorMap} tagMap={tagMap} />
  ), [authorMap, tagMap]);

  const renderAuthor = useCallback(({ item }: any) => (
    <SearchAuthorItem item={item} navigation={navigation} />
  ), [navigation]);

  const renderTag = useCallback(({ item }: any) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('TagHomeScreen', { id: item.id, name: item.name })}
      style={styles.tagItem}
    >
      <View style={styles.tagItemInner}>
        <FontAwesome5 name={'tag' as any} size={14} color="cyan" iconStyle="solid" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.tagName}>{item.name}</Text>
          <Text style={styles.tagType}>
            {item.isPrimary ? 'Primary Genre' : 'Tag'}
          </Text>
        </View>
        <FontAwesome5
          name={'chevron-right' as any}
          size={12}
          color="rgba(255,255,255,0.25)"
          iconStyle="solid"
        />
      </View>
    </TouchableOpacity>
  ), [navigation]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Screen>
      <LinearGradient
        colors={['#13192C', '#161616', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <FontAwesome5 name={'chevron-left' as any} size={18} color="#fff" iconStyle="solid" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <SearchInput
              ref={inputRef}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Stories, authors, genres…"
              maxLength={50}
              iconColor="rgba(0,0,0,0.5)"
              showClear
            />
          </View>
        </View>

        {/* ── Tab bar ─────────────────────────────────────────────────────────
            Icons squish away as user scrolls via tabIconStyle.
            Labels remain visible so the user always knows the active tab. */}
        <View style={styles.tabBar}>
          {TABS.map((tab, i) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.7}
                onPress={() => handleTabPress(tab.id, i)}
                style={styles.tab}
              >
                <Animated.View style={tabIconStyle}>
                  <FontAwesome5
                    name={tab.icon}
                    size={13}
                    color={isActive ? 'cyan' : 'rgba(255,255,255,0.35)'}
                    iconStyle="solid"
                  />
                </Animated.View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
        </View>

        {/* ── Filter bar ──────────────────────────────────────────────────────
            Two animated wrappers:
            1. filterBarTabStyle  — fades out entirely on non-stories tabs
            2. filterBarScrollStyle — reduces paddingVertical 10→4 as user scrolls */}
        <Animated.View
          style={filterBarTabStyle}
          pointerEvents={activeTab === 'stories' ? 'auto' : 'none'}
        >
          <Animated.View style={filterBarScrollStyle}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterBar}
            >
              <FilterChip
                label={`${SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort'} ▾`}
                active={sortBy !== 'newest'}
                onPress={() => setShowSortSheet(true)}
                icon={'sort' as any}
              />
              <View style={styles.filterDivider} />
              {DURATION_OPTIONS.map(opt => (
                <FilterChip
                  key={opt.value}
                  label={opt.label}
                  active={duration === opt.value}
                  onPress={() => setDuration(opt.value)}
                />
              ))}
              <View style={styles.filterDivider} />
              <FilterChip
                label="All Genres"
                active={selectedTagId === null}
                onPress={() => setSelectedTagId(null)}
              />
              {(primaryTags ?? []).filter(tag => !tag.isErotic).map(tag => (
                <FilterChip
                    key={tag.id}
                    label={tag.name ?? ''}
                    active={selectedTagId === tag.id}
                    onPress={() => setSelectedTagId(
                        selectedTagId === tag.id ? null : tag.id
                    )}
                />
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.View>

        {/* ── Results ── */}
        <Animated.View style={[{ flex: 1 }, contentStyle]}>

          {activeTab === 'stories' && (
            storiesLoading ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator color="cyan" />
              </View>
            ) : (
              <AnimatedFlatList
                data={storyItems}
                renderItem={renderStory}
                keyExtractor={(item: any) => item.id ?? item.title}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                onEndReached={() => {
                  if (hasMoreStories && !storiesFetchingMore) fetchMoreStories();
                }}
                onEndReachedThreshold={0.4}
                contentContainerStyle={styles.listContent}
                ListFooterComponent={
                  storiesFetchingMore
                    ? <ActivityIndicator color="cyan" style={{ marginVertical: 20 }} />
                    : null
                }
                ListEmptyComponent={
                  <EmptyState
                    icon={'headphones' as any}
                    title={debouncedQuery.length > 0
                      ? `No stories found for "${debouncedQuery}"`
                      : 'No stories found'}
                    subtitle={debouncedQuery.length > 0
                      ? 'Try a different search or adjust your filters'
                      : 'Adjust your filters to see stories'}
                  />
                }
              />
            )
          )}

          {activeTab === 'authors' && (
            authorsLoading ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator color="cyan" />
              </View>
            ) : (
              <AnimatedFlatList
                data={authorResults ?? []}
                renderItem={renderAuthor}
                keyExtractor={(item: any) => item.id}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <EmptyState
                    icon={'user-edit' as any}
                    title={debouncedQuery.length >= 2
                      ? `No authors found for "${debouncedQuery}"`
                      : 'Search for an author'}
                    subtitle={debouncedQuery.length >= 2
                      ? 'Try a different name'
                      : 'Type at least 2 characters to search'}
                  />
                }
              />
            )
          )}

          {activeTab === 'tags' && (
            tagsLoading ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator color="cyan" />
              </View>
            ) : (
              <AnimatedFlatList
                data={filteredTagResults}
                renderItem={renderTag}
                keyExtractor={(item: any) => item.id}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <EmptyState
                    icon={'tag' as any}
                    title={debouncedQuery.length >= 2
                      ? `No genres found for "${debouncedQuery}"`
                      : 'Search for a genre'}
                    subtitle={debouncedQuery.length >= 2
                      ? 'Try a different name'
                      : 'Type at least 2 characters to search'}
                  />
                }
              />
            )
          )}

        </Animated.View>

        <SortSheet
          visible={showSortSheet}
          current={sortBy}
          onSelect={setSortBy}
          onClose={() => setShowSortSheet(false)}
        />

      </LinearGradient>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.margin,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabBar: {
    flexDirection: 'row',
    position: 'relative',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2a',
  },
  tab: {
    width: TAB_WIDTH,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: 'cyan',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: TAB_WIDTH,
    height: 2,
    backgroundColor: 'cyan',
    borderRadius: 1,
  },

  filterBar: {
    paddingHorizontal: spacing.margin,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  filterChipActive: {
    backgroundColor: 'cyan',
    borderColor: 'cyan',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  filterChipTextActive: {
    color: '#000',
  },
  filterDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 4,
  },

  listContent: {
    paddingBottom: 120,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },

  authorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.margin,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e1e',
    gap: 14,
  },
  authorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.15)',
  },
  authorInfo: {
    flex: 1,
    gap: 3,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  authorBio: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 17,
  },

  tagItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e1e',
  },
  tagItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.margin,
    paddingVertical: 16,
    gap: 12,
  },
  tagName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  tagType: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.margin * 3,
    marginTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    lineHeight: 19,
  },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#2a2a2a',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e1e',
  },
  sheetOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sheetOptionText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  sheetOptionTextActive: {
    color: 'cyan',
    fontWeight: '700',
  },
});

export default SearchScreen;