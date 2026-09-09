import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
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

import {
    useStoriesByTagNew,
    useStoriesByTagTrending,
    useStoriesByTagShort,
    useStoriesByStoryTag,
} from '../../hooks/queries/useStories';
import { useTagNames }    from '../../hooks/queries/useTagNames';
import { useAuthors } from '../../hooks/queries/useAuthors';

import { useStoryProgressMap } from '../../hooks/queries/useStoryProgressMap';
import { useNarrators } from '../../hooks/queries/useNarrators';
import { useStoryNarratorLinks } from '../../hooks/queries/useStoryNarratorLinks';
import { isRecentlyPublished, formatNarratorDisplay } from '../../lib/storyDisplay';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const GenreHome = ({ navigation }: any) => {

    const route  = useRoute();
    const { id: tagId, name: tagName }: any = route.params;
    const insets = useSafeAreaInsets();
    const typo   = useTypography();

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

    // ── Lookup maps ───────────────────────────────────────────────────────────
const primaryTagIds = useMemo(() => {
    const all = [...(newStories ?? []), ...(trendingStories ?? []), ...(shortStories ?? [])];
    return all.flatMap((s: any) => [s.primaryTagId, s.secondaryTagId]);
}, [newStories, trendingStories, shortStories]);

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

    // ── Fallback: StoryTag join query for minor tags ───────────────────────────
    // Only runs when primary GSI queries come back empty — covers tags that are
    // used as secondary/additional tags via the StoryTag join table.
    const primaryEmpty =
        !isLoading &&
        enrichedNew.length      === 0 &&
        enrichedTrending.length === 0 &&
        enrichedShort.length    === 0;

    const { data: taggedStories, isLoading: taggedLoading } =
        useStoriesByStoryTag(primaryEmpty ? tagId : '');

const taggedTagIds = useMemo(() => {
    return (taggedStories ?? []).flatMap((s: any) => [s.primaryTagId, s.secondaryTagId]);
}, [taggedStories]);

const { data: taggedTagMap = {} } = useTagNames(taggedTagIds);

const enrichedTagged = useMemo(() => {
    return (taggedStories ?? []).map((s: any) => {
        const progress = progressMap[s.id];
        return {
            ...s,
            primaryTagName:   taggedTagMap[s.primaryTagId   ?? ''] ?? tagMap[s.primaryTagId   ?? ''] ?? '',
            secondaryTagName: taggedTagMap[s.secondaryTagId ?? ''] ?? tagMap[s.secondaryTagId ?? ''] ?? '',
            authorName:       authorMap[s.authorId ?? ''] ?? '',
            narratorDisplay:  formatNarratorDisplay(storyNarratorsMap[s.id]),
            isNew:            isRecentlyPublished(s.publishedAt),
            progressStatus:   progress?.status ?? 'none',
            progressSeconds:  progress?.progressSeconds ?? 0,
        };
    });
}, [taggedStories, taggedTagMap, tagMap, authorMap, storyNarratorsMap, progressMap]);

    const totalLoading = isLoading || (primaryEmpty && taggedLoading);
    const totalEmpty   =
        primaryEmpty &&
        !taggedLoading &&
        enrichedTagged.length === 0;

    // ── Render ────────────────────────────────────────────────────────────────
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
                        <FontAwesome5
                            name="chevron-left"
                            size={18}
                            color="#fff"
                            iconStyle="solid"
                        />
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

                {/* Content */}
                {totalLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color="cyan" size="large" />
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    >
                        {/* Featured carousel */}
                        {enrichedNew.length > 0 && (
                            <View style={{ marginTop: 20 }}>
                                <ForYouCarousel
                                    stories={enrichedNew}
                                    tagMap={tagMap}
                                />
                            </View>
                        )}

                        {/* Trending */}
                        {enrichedTrending.length > 0 && (
                            <View style={{ marginTop: 20 }}>
                                <View style={styles.sectionHeader}>
                                    <Text style={typo.title}>Trending</Text>
                                </View>
                                <HorizontalList
                                    stories={enrichedTrending}
                                    tagId={tagId}
                                    tagName={tagName}
                                />
                            </View>
                        )}

                        {/* Brand New */}
                        {enrichedNew.length > 0 && (
                            <View style={{ marginTop: 20 }}>
                                <View style={styles.sectionHeader}>
                                    <Text style={typo.title}>Brand New</Text>
                                </View>
                                <HorizontalList
                                    stories={enrichedNew}
                                    tagId={tagId}
                                    tagName={tagName}
                                />
                            </View>
                        )}

                        {/* Short & Sweet */}
                        {enrichedShort.length > 0 && (
                            <View style={{ marginTop: 20 }}>
                                <View style={styles.sectionHeader}>
                                    <Text style={typo.title}>Short & Sweet</Text>
                                </View>
                                <HorizontalList
                                    stories={enrichedShort}
                                    tagId={tagId}
                                    tagName={tagName}
                                />
                            </View>
                        )}

                        {/* Minor tag fallback — StoryTag join lookup */}
                        {primaryEmpty && enrichedTagged.length > 0 && (
                            <View style={{ marginTop: 20 }}>
                                <View style={styles.sectionHeader}>
                                    <Text style={typo.title}>Stories</Text>
                                </View>
                                <HorizontalList
                                    stories={enrichedTagged}
                                    tagId={tagId}
                                    tagName={tagName}
                                />
                            </View>
                        )}

                        {/* Empty state */}
                        {totalEmpty && (
                            <View style={styles.emptyContainer}>
                                <FontAwesome5
                                    name="book-open"
                                    size={32}
                                    color="rgba(255,255,255,0.2)"
                                    iconStyle="solid"
                                />
                                <Text style={styles.emptyText}>
                                    No stories in {tagName} yet
                                </Text>
                            </View>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
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
});

export default GenreHome;