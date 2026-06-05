import React, { useMemo } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
} from 'react-native';

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
} from '../../hooks/queries/useStories';
import { useTags } from '../../hooks/queries/useTags';
import { useAuthors } from '../../hooks/queries/useAuthors';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const GenreHome = ({ navigation }: any) => {

    const route = useRoute();
    const { id: tagId, name: tagName }: any = route.params;
    const insets = useSafeAreaInsets();
    const typo = useTypography();

    // ── Real data ─────────────────────────────────────────────────────────────
    const { data: newStories,      isLoading: newLoading }      = useStoriesByTagNew(tagId);
    const { data: trendingStories, isLoading: trendingLoading } = useStoriesByTagTrending(tagId);
    const { data: shortStories,    isLoading: shortLoading }    = useStoriesByTagShort(tagId);
    const { data: tags }    = useTags();
    const { data: authors } = useAuthors();

    const isLoading = newLoading || trendingLoading || shortLoading;

    // Build tag lookup map
    const tagMap = useMemo(() => {
        if (!tags) return {};
        return tags.reduce((acc: Record<string, string>, tag) => {
            if (tag.id && tag.name) acc[tag.id] = tag.name;
            return acc;
        }, {});
    }, [tags]);

    // Build author lookup map
    const authorMap = useMemo(() => {
        if (!authors) return {};
        return authors.reduce((acc: Record<string, string>, author) => {
            if (author.id && author.name) acc[author.id] = author.name;
            return acc;
        }, {});
    }, [authors]);

    // Enrich stories with resolved names
    const enrich = (stories: any[]) =>
        stories.map(s => ({
            ...s,
            primaryTagName:   tagMap[s.primaryTagId ?? ''] ?? '',
            secondaryTagName: tagMap[s.secondaryTagId ?? ''] ?? '',
            authorName:       authorMap[s.authorId ?? ''] ?? '',
        }));

    const enrichedNew      = useMemo(() => enrich(newStories ?? []),      [newStories, tagMap, authorMap]);
    const enrichedTrending = useMemo(() => enrich(trendingStories ?? []), [trendingStories, tagMap, authorMap]);
    const enrichedShort    = useMemo(() => enrich(shortStories ?? []),    [shortStories, tagMap, authorMap]);

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
                {/* ── Sticky header ── */}
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

                {/* ── Content ── */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color="cyan" size="large" />
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    >
                        {/* ── Featured carousel — Brand New ── */}
                        {enrichedNew.length > 0 && (
                            <View style={{ marginTop: 20 }}>
                                <ForYouCarousel
                                    stories={enrichedNew}
                                    tagMap={tagMap}
                                />
                            </View>
                        )}

                        {/* ── Trending ── */}
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

                        {/* ── Brand New ── */}
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

                        {/* ── Short & Sweet ── */}
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

                        {/* Empty state */}
                        {enrichedNew.length === 0 &&
                         enrichedTrending.length === 0 &&
                         enrichedShort.length === 0 && (
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.margin,
        paddingBottom: 14,
        backgroundColor: '#000000CC',
        //borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#2a2a2a',
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
        marginRight: 8,
    },
    headerTitle: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        textTransform: 'capitalize',
    },

    sectionHeader: {
        marginLeft: spacing.margin,
        paddingVertical: spacing.margin,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    emptyContainer: {
        alignItems: 'center',
        paddingTop: 80,
        gap: 16,
    },
    emptyText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.4)',
    },
    browseText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
},
});

export default GenreHome;