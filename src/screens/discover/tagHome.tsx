import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '@/components/common/AppText';

import { useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import Animated, {
    useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate, Extrapolation,
} from 'react-native-reanimated';

import Screen from '@/components/common/Screen';
import { spacing } from '../../theme/spacing';
import useTypography from '../../theme/typography';
import { CachedImage } from '../../components/common/CachedImage';
import StoryTile from '../../components/story/StoryTile';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import TagRowView from '../../components/tag/TagRows';

import { useTag } from '../../hooks/queries/useTagNames';
import { useTagHome } from '../../hooks/queries/useTagHome';
import { Analytics } from '../../lib/analytics';

const HERO_HEIGHT = 340;
const HEADER_THRESHOLD_START = HERO_HEIGHT - 120;
const HEADER_THRESHOLD_END   = HERO_HEIGHT - 60;

// The Tag Home screen: the mini home page of one genre. How it looks depends on how many live stories the
// genre has (see lib/tagLayout.ts), and the CMS can change the rows per genre.
const GenreHome = ({ navigation }: any) => {
    const route = useRoute();
    const { id: tagId, name: tagName }: any = route.params;
    const insets = useSafeAreaInsets();
    const typo = useTypography();

    const { data: tag } = useTag(tagId);
    const { data: heroUri } = useStoryImage(tag?.heroImageUri);
    const home = useTagHome(tagId, tagName ?? '', !!tag?.isErotic);

    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler({ onScroll: (e) => { scrollY.value = e.contentOffset.y; } });
    const stickyStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [HEADER_THRESHOLD_START, HEADER_THRESHOLD_END], [0, 1], Extrapolation.CLAMP),
        backgroundColor: '#111',
    }));

    useEffect(() => {
        if (home.ready && home.tier) Analytics.tagHomeShown({ tagId, tier: home.tier });
    }, [home.ready, home.tier, tagId]);

    // The vertical list ("all stories") is the FlatList's data; the rows around it are its header and footer.
    const listIndex = home.rows.findIndex(r => r.type === 'tagAll' || r.type === 'tagBrowseAll');
    const listRow = listIndex >= 0 ? home.rows[listIndex] : null;
    const headRows = listIndex >= 0 ? home.rows.slice(0, listIndex) : home.rows;
    const footRows = listIndex >= 0 ? home.rows.slice(listIndex + 1) : [];
    const listTitle = listRow
        ? (listRow.section.title || (listRow.type === 'tagAll' ? 'Stories' : home.tier === 'large' ? `Browse all ${tagName}` : `More ${tagName}`))
        : '';
    const hasStories = home.rows.some(r => r.stories.length > 0);

    const renderRows = (rows: typeof home.rows, offset: number) => rows.map((row, i) => (
        <TagRowView key={row.key} row={row} index={Math.min(offset + i + 1, 6)} tagMap={home.tagMap} relatedTags={home.relatedTags} />
    ));

    const Header = (
        <>
            {heroUri ? (
                <View style={styles.heroWrapper}>
                    <CachedImage source={{ uri: heroUri }} style={styles.heroImage} resizeMode="cover" />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)', '#000']} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
                    <View style={[styles.heroTopRow, { paddingTop: insets.top + 10 }]}>
                        <TouchableOpacity hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} onPress={() => navigation.goBack()}
                            accessibilityRole="button" accessibilityLabel="Go back" style={styles.heroBubble} activeOpacity={0.7}>
                            <FontAwesome5 name="chevron-left" size={16} color="#fff" iconStyle="solid" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.heroTitle}>{(tagName ?? '').toUpperCase()}</Text>
                </View>
            ) : (
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} onPress={() => navigation.goBack()}
                        accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} activeOpacity={0.7}>
                        <FontAwesome5 name="chevron-left" size={18} color="#fff" iconStyle="solid" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{tagName}</Text>
                </View>
            )}

            {!home.ready ? (
                <View style={styles.loadingContainer}><ActivityIndicator color="cyan" size="large" /></View>
            ) : (
                <>
                    {tag?.description ? <Text style={styles.description}>{tag.description}</Text> : null}
                    {!hasStories && (
                        <View style={styles.emptyContainer}>
                            <FontAwesome5 name="book-open" size={32} color="rgba(255,255,255,0.5)" iconStyle="solid" />
                            <Text style={styles.emptyText}>No stories in {tagName} yet</Text>
                            {home.relatedTags.length > 0 && <Text style={styles.emptyHint}>These genres might be a good place to start.</Text>}
                        </View>
                    )}
                    {renderRows(headRows, 0)}
                    {listRow && (
                        <View style={styles.sectionHeader}><Text style={typo.title} accessibilityRole="header">{listTitle}</Text></View>
                    )}
                </>
            )}
        </>
    );

    const renderItem = useCallback(({ item }: { item: any }) => <GenreStoryTile item={item} />, []);

    return (
        <Screen>
            <StatusBar style="light" />
            <LinearGradient colors={['#212121', '#000', '#000']} style={{ flex: 1 }} start={{ x: 1, y: 1 }} end={{ x: 0.5, y: 0.5 }}>
                {heroUri && (
                    <Animated.View style={[styles.heroStickyHeader, stickyStyle, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
                        <TouchableOpacity hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} onPress={() => navigation.goBack()}
                            accessibilityRole="button" accessibilityLabel="Go back" style={styles.heroStickyBackBtn} activeOpacity={0.7}>
                            <FontAwesome5 name="chevron-left" size={18} color="#fff" iconStyle="solid" />
                        </TouchableOpacity>
                        <Text style={styles.heroStickyTitle} numberOfLines={1}>{tagName}</Text>
                        <View style={{ width: 34 }} />
                    </Animated.View>
                )}
                <Animated.FlatList
                    data={home.ready && listRow ? listRow.stories : []}
                    keyExtractor={(item: any) => item.id}
                    renderItem={renderItem as any}
                    ListHeaderComponent={Header}
                    ListFooterComponent={
                        <>
                            {home.fetchingMore ? <View style={{ paddingVertical: 24 }}><ActivityIndicator color="cyan" /></View> : null}
                            {home.ready ? renderRows(footRows, headRows.length) : null}
                            <View style={{ height: 40 }} />
                        </>
                    }
                    onEndReached={() => { if (listRow?.type === 'tagBrowseAll' && home.hasMore) home.fetchMore(); }}
                    onEndReachedThreshold={0.5}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                />
            </LinearGradient>
        </Screen>
    );
};

// Per-tile wrapper: turns the cover's storage key into a link, like the other story lists.
const GenreStoryTile = React.memo(({ item }: { item: any }) => {
    const { data: resolved } = useStoryImage(item?.imageUri?.startsWith('stories/') ? item.imageUri : null);
    return (
        <StoryTile
            id={item.id}
            title={item.title}
            primaryTag={item.primaryTagName}
            secondaryTag={item.secondaryTagName}
            summary={item.summary}
            imageUri={resolved ?? item.imageUri ?? ''}
            audioUri={item.audioUri}
            author={item.authorName}
            duration={item.duration}
            licenseType={item.licenseType}
            spiceRating={item.spiceRating}
            universeId={item.universeId}
            sequenceNumber={item.sequenceNumber}
            isPremium={item.isPremium}
        />
    );
});

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
        color:    'rgba(255,255,255,0.6)',
    },
    description: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        lineHeight: 20,
        marginHorizontal: spacing.margin,
        marginBottom: 8,
    },
    emptyHint: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
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