import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Image } from 'react-native';
import { Text } from '@/components/common/AppText';

import { useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import Screen from '@/components/common/Screen';
import { spacing } from '../../theme/spacing';
import useTypography from '../../theme/typography';

import ForYouCarousel from '../../components/story/ForYouCarousel';
import HorizontalList from '../../components/story/HorizontalList';
import StoryTile from '../../components/story/StoryTile';

import { useStoryImage } from '../../hooks/queries/useStoryImage';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';

import {
    useStoriesByTagNew,
    useStoriesByTagTrending,
    useStoriesByTagShort,
    useStoriesByStoryTag,
    useStoriesByTagPaginated,
} from '../../hooks/queries/useStories';
import { useTagNames, useTag } from '../../hooks/queries/useTagNames';
import { useAuthors } from '../../hooks/queries/useAuthors';

import { useStoryProgressMap } from '../../hooks/queries/useStoryProgressMap';
import { useNarrators } from '../../hooks/queries/useNarrators';
import { useStoryNarratorLinks } from '../../hooks/queries/useStoryNarratorLinks';
import { isRecentlyPublished, formatNarratorDisplay } from '../../lib/storyDisplay';

    const BrowseAllStoryTile = ({ item }: { item: any }) => {
        const { data: resolvedImageUri } = useStoryImage(
            item.imageUri?.startsWith('stories/') ? item.imageUri : null
        );
        const displayImageUri = resolvedImageUri ?? item.imageUri ?? '';

        return (
            <StoryTile
                id={item.id}
                title={item.title}
                primaryTag={item.primaryTagName}
                secondaryTag={item.secondaryTagName}
                summary={item.summary}
                imageUri={displayImageUri}
                audioUri={item.audioUri}
                author={item.authorName}
                duration={item.duration}
                licenseType={item.licenseType}
                universeId={item.universeId}
                sequenceNumber={item.sequenceNumber}
                isPremium={item.isPremium}
            />
        );
    };


// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const GenreHome = ({ navigation }: any) => {

    const route  = useRoute();
    const { id: tagId, name: tagName }: any = route.params;
    const insets = useSafeAreaInsets();
    const typo   = useTypography();

    const HERO_HEIGHT = 340;
    const HEADER_THRESHOLD_START = HERO_HEIGHT - 120;
    const HEADER_THRESHOLD_END   = HERO_HEIGHT - 60;

    const { data: tag } = useTag(tagId);

    const { data: resolvedHeroImageUri } = useStoryImage(tag?.heroImageUri);

    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => { scrollY.value = e.contentOffset.y; },
    });

    const heroHeaderStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [HEADER_THRESHOLD_START, HEADER_THRESHOLD_END],
            [0, 1],
            Extrapolation.CLAMP
        ),
        backgroundColor: '#111',
    }));

    // ── Primary-tag queries (by primaryTagId GSI) ─────────────────────────────
    const { data: newStories,      isLoading: newLoading }      = useStoriesByTagNew(tagId);
    const { data: trendingStories, isLoading: trendingLoading } = useStoriesByTagTrending(tagId);
    const { data: shortStories,    isLoading: shortLoading }    = useStoriesByTagShort(tagId);

    const { data: authors } = useAuthors();

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

    const isLoading = newLoading || trendingLoading || shortLoading;

    // ── "Browse all" — paginated, for Version 2 (listing layout) ──────────────
    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useStoriesByTagPaginated(tagId);

    const primaryPaginatedStories = useMemo(
        () => (infiniteData?.pages ?? []).flatMap(p => p.items),
        [infiniteData]
    );

    // If the primary GSI's first page comes back completely empty (no items,
    // no next page), this tag is likely only used as a secondary/additional
    // tag — fall back to the StoryTag join query instead, paginating
    // client-side since that query can't be paginated server-side.
    const primaryTotallyEmpty =
        !!infiniteData &&
        infiniteData.pages[0]?.items.length === 0 &&
        !infiniteData.pages[0]?.nextToken;

    const { data: fallbackAllStories } = useStoriesByStoryTag(primaryTotallyEmpty ? tagId : '');
    const [fallbackVisibleCount, setFallbackVisibleCount] = useState(10);

    const usingFallback = primaryTotallyEmpty;
    const browseAllStoriesRaw = usingFallback
        ? (fallbackAllStories ?? []).slice(0, fallbackVisibleCount)
        : primaryPaginatedStories;

    const canLoadMore = usingFallback
        ? fallbackVisibleCount < (fallbackAllStories?.length ?? 0)
        : !!hasNextPage;

    const loadingMore = usingFallback ? false : isFetchingNextPage;

    const loadMore = () => {
        if (usingFallback) {
            setFallbackVisibleCount(c => c + 10);
        } else if (hasNextPage) {
            fetchNextPage();
        }
    };

    // ── Lookup maps ───────────────────────────────────────────────────────────
    const primaryTagIds = useMemo(() => {
        const all = [
            ...(newStories ?? []),
            ...(trendingStories ?? []),
            ...(shortStories ?? []),
            ...browseAllStoriesRaw,
        ];
        return all.flatMap((s: any) => [s.primaryTagId, s.secondaryTagId]);
    }, [newStories, trendingStories, shortStories, browseAllStoriesRaw]);

    const { data: tagMap = {} } = useTagNames(primaryTagIds);

    const authorMap = useMemo(() => {
        if (!authors) return {};
        return authors.reduce((acc: Record<string, string>, author) => {
            if (author.id && author.name) acc[author.id] = author.name;
            return acc;
        }, {});
    }, [authors]);

    const enrich = (stories: any[]) =>
        stories.map(s => {
            const progress = progressMap[s.id];
            return {
                ...s,
                primaryTagName:   tagMap[s.primaryTagId   ?? ''] ?? '',
                secondaryTagName: tagMap[s.secondaryTagId ?? ''] ?? '',
                authorName:       authorMap[s.authorId    ?? ''] ?? '',
                narratorDisplay:  formatNarratorDisplay(storyNarratorsMap[s.id]),
                isNew:            isRecentlyPublished(s.publishedAt),
                progressStatus:   progress?.status ?? 'none',
                progressSeconds:  progress?.progressSeconds ?? 0,
            };
        });

    const enrichedNew      = useMemo(() => enrich(newStories      ?? []), [newStories,      tagMap, authorMap, storyNarratorsMap, progressMap]);
    const enrichedTrending = useMemo(() => enrich(trendingStories ?? []), [trendingStories, tagMap, authorMap, storyNarratorsMap, progressMap]);
    const enrichedShort    = useMemo(() => enrich(shortStories    ?? []), [shortStories,    tagMap, authorMap, storyNarratorsMap, progressMap]);
    const enrichedBrowseAll = useMemo(() => enrich(browseAllStoriesRaw), [browseAllStoriesRaw, tagMap, authorMap, storyNarratorsMap, progressMap]);

    // ── Fallback: StoryTag join query for minor tags (horizontal sections) ────
    const primaryEmpty =
        !isLoading &&
        enrichedNew.length      === 0 &&
        enrichedTrending.length === 0 &&
        enrichedShort.length    === 0;

    const { data: taggedStories, isLoading: taggedLoading } =
        useStoriesByStoryTag(primaryEmpty ? tagId : '');

    const enrichedTagged = useMemo(() => enrich(taggedStories ?? []), [taggedStories, tagMap, authorMap, storyNarratorsMap, progressMap]);

    const totalLoading = isLoading || (primaryEmpty && taggedLoading);
    const totalEmpty   =
        primaryEmpty &&
        !taggedLoading &&
        enrichedTagged.length === 0 &&
        enrichedBrowseAll.length === 0;

    // ── Render: Version 1 — Hero layout (mini home screen) ────────────────────
    if (tag?.useHeroLayout) {
        return (
            <Screen>
                <StatusBar style="light" />

                {/* Sticky header — fades in as the hero title scrolls out of view */}
                <Animated.View
                    style={[styles.heroStickyHeader, heroHeaderStyle, { paddingTop: insets.top + 10 }]}
                    pointerEvents="box-none"
                >
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.heroStickyBackBtn}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="chevron-left" size={18} color="#fff" iconStyle="solid" />
                    </TouchableOpacity>
                    <Text style={styles.heroStickyTitle} numberOfLines={1}>
                        {tagName}
                    </Text>
                    <View style={{ width: 34 }} />
                </Animated.View>

                <Animated.ScrollView
                    showsVerticalScrollIndicator={false}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                >
                    {/* Hero */}
                    <View style={styles.heroWrapper}>
                        {resolvedHeroImageUri ? (
                            <Image source={{ uri: resolvedHeroImageUri }} style={styles.heroImage} resizeMode="cover" />
                        ) : (
                            <View style={[styles.heroImage, { backgroundColor: '#1a1a1a' }]} />
                        )}
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.5)', '#000']}
                            locations={[0, 0.6, 1]}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={[styles.heroTopRow, { paddingTop: insets.top + 10 }]}>
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                style={styles.heroBubble}
                                activeOpacity={0.7}
                            >
                                <FontAwesome5 name="chevron-left" size={16} color="#fff" iconStyle="solid" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('BrowseByTitle')}
                                style={styles.heroBubble}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.heroBubbleText}>Browse</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.heroTitle}>{(tagName ?? '').toUpperCase()}</Text>
                    </View>

                    {totalLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color="cyan" size="large" />
                        </View>
                    ) : (
                        <>
                            {enrichedNew.length > 0 && (
                                <View style={{ marginTop: 4 }}>
                                    <ForYouCarousel stories={enrichedNew} tagMap={tagMap} />
                                </View>
                            )}

                            {enrichedTrending.length > 0 && (
                                <View style={{ marginTop: 20 }}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={typo.title}>Trending</Text>
                                    </View>
                                    <HorizontalList stories={enrichedTrending} tagId={tagId} tagName={tagName} />
                                </View>
                            )}

                            {enrichedNew.length > 0 && (
                                <View style={{ marginTop: 20 }}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={typo.title}>Brand New</Text>
                                    </View>
                                    <HorizontalList stories={enrichedNew} tagId={tagId} tagName={tagName} />
                                </View>
                            )}

                            {enrichedShort.length > 0 && (
                                <View style={{ marginTop: 20 }}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={typo.title}>Short & Sweet</Text>
                                    </View>
                                    <HorizontalList stories={enrichedShort} tagId={tagId} tagName={tagName} />
                                </View>
                            )}

                            {primaryEmpty && enrichedTagged.length > 0 && (
                                <View style={{ marginTop: 20 }}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={typo.title}>Stories</Text>
                                    </View>
                                    <HorizontalList stories={enrichedTagged} tagId={tagId} tagName={tagName} />
                                </View>
                            )}

                            {totalEmpty && (
                                <View style={styles.emptyContainer}>
                                    <FontAwesome5 name="book-open" size={32} color="rgba(255,255,255,0.2)" iconStyle="solid" />
                                    <Text style={styles.emptyText}>No stories in {tagName} yet</Text>
                                </View>
                            )}
                        </>
                    )}
                 </Animated.ScrollView>
            </Screen>
        );
    }

    // ── Render: Version 2 — Enhanced listing layout ────────────────────────────
    const ListingHeader = () => (
        <>
            {enrichedTrending.length > 0 && (
                <View style={{ marginTop: 20 }}>
                    <View style={styles.sectionHeader}>
                        <Text style={typo.title}>Trending</Text>
                    </View>
                    <HorizontalList stories={enrichedTrending} tagId={tagId} tagName={tagName} />
                </View>
            )}

            {enrichedNew.length > 0 && (
                <View style={{ marginTop: 20 }}>
                    <View style={styles.sectionHeader}>
                        <Text style={typo.title}>New</Text>
                    </View>
                    <HorizontalList stories={enrichedNew} tagId={tagId} tagName={tagName} />
                </View>
            )}

            {primaryEmpty && enrichedTagged.length > 0 && (
                <View style={{ marginTop: 20 }}>
                    <View style={styles.sectionHeader}>
                        <Text style={typo.title}>New</Text>
                    </View>
                    <HorizontalList stories={enrichedTagged} tagId={tagId} tagName={tagName} />
                </View>
            )}

            {enrichedBrowseAll.length > 0 && (
                <View style={styles.sectionHeader}>
                    <Text style={typo.title}>Browse all {tagName}</Text>
                </View>
            )}
        </>
    );

    return (
        <Screen>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#212121', '#000', '#000']}
                style={{ flex: 1 }}
                start={{ x: 1, y: 1 }}
                end={{ x: 0.5, y: 0.5 }}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backBtn}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="chevron-left" size={18} color="#fff" iconStyle="solid" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {tagName}
                    </Text>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('BrowseByTitle')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.browseText}>Browse</Text>
                    </TouchableOpacity>
                </View>

                {totalLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color="cyan" size="large" />
                    </View>
                ) : totalEmpty ? (
                    <View style={styles.emptyContainer}>
                        <FontAwesome5 name="book-open" size={32} color="rgba(255,255,255,0.2)" iconStyle="solid" />
                        <Text style={styles.emptyText}>No stories in {tagName} yet</Text>
                    </View>
                ) : (
                    <FlatList
                        data={enrichedBrowseAll}
                        keyExtractor={(item: any) => item.id}
                        renderItem={({ item }) => (
                <StoryTile
                    id={item.id}
                    title={item.title}
                    primaryTag={item.primaryTagName}
                    secondaryTag={item.secondaryTagName}
                    summary={item.summary}
                    imageUri={item.imageUri}
                    audioUri={item.audioUri}
                    author={item.authorName}
                    duration={item.duration}
                    licenseType={item.licenseType}
                    universeId={item.universeId}
                    sequenceNumber={item.sequenceNumber}
                    isPremium={item.isPremium}
                />
            )}
                        ListHeaderComponent={ListingHeader}
                        onEndReached={() => { if (canLoadMore) loadMore(); }}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            loadingMore ? (
                                <View style={{ paddingVertical: 24 }}>
                                    <ActivityIndicator color="cyan" />
                                </View>
                            ) : <View style={{ height: 40 }} />
                        }
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    />
                )}
            </LinearGradient>
        </Screen>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    header: {
        flexDirection:     'row',
        alignItems:        'center',
        paddingHorizontal: spacing.margin,
        paddingBottom:     14,
        backgroundColor:   '#000000CC',
        borderBottomColor: '#2a2a2a',
    },
    backBtn: {
        padding:     8,
        marginLeft:  -8,
        marginRight: 8,
    },
    headerTitle: {
        flex:          1,
        fontSize:      24,
        fontWeight:    '700',
        color:         '#fff',
        textTransform: 'capitalize',
    },
    sectionHeader: {
        marginLeft:    spacing.margin,
        paddingVertical: spacing.margin,
    },
    loadingContainer: {
        flex:           1,
        justifyContent: 'center',
        alignItems:     'center',
        paddingTop:     100,
    },
    emptyContainer: {
        alignItems:   'center',
        paddingTop:   80,
        gap:          16,
    },
    emptyText: {
        fontSize: 15,
        color:    'rgba(255,255,255,0.4)',
    },
    browseText: {
        color:    'rgba(255,255,255,0.6)',
        fontSize: 14,
    },

    // ── Hero layout (Version 1) ─────────────────────────────────────────────
    heroWrapper: {
        height: 340,
        justifyContent: 'flex-end',
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
    },
    heroTopRow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.margin,
    },
    heroBubble: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroBubbleText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    heroTitle: {
        fontSize: 40,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1,
        paddingHorizontal: spacing.margin,
        paddingBottom: 24,
        textAlign: 'center',
    },
        heroStickyHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.margin,
        paddingBottom: 12,
        gap: 10,
    },
    heroStickyBackBtn: {
        width: 34,
        alignItems: 'center',
    },
    heroStickyTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        textTransform: 'capitalize',
    },
});

export default GenreHome;