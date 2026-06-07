import React, { useMemo, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import AntDesign    from '@react-native-vector-icons/ant-design';

import StoryTile              from '@/components/story/StoryTile';
import EroticContinueListening from '@/components/erotic/EroticContinueListening';

import { useEroticStories } from '@/hooks/queries/useEroticStories';
import { useTags }       from '@/hooks/queries/useTags';
import { useAuthors }    from '@/hooks/queries/useAuthors';
import { useStoryImage } from '@/hooks/queries/useStoryImage';

const { width } = Dimensions.get('window');
const GENRE_TILE_W = 130;
const GENRE_TILE_H = 64;
const EROTIC_ORANGE = '#ff7c2a';

// ---------------------------------------------------------------------------
// Sub-genre tile
// ---------------------------------------------------------------------------

const EroticGenreTile = ({ tag, navigation }: { tag: any; navigation: any }) => (
    <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('TagHomeScreen', { id: tag.id, name: tag.name })}
        style={styles.genreTile}
    >
        <LinearGradient
            colors={[tag.color ? `${tag.color}33` : '#2a100022', '#0a0500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
        />
        <Text style={styles.genreTileName} numberOfLines={1}>#{tag.name}</Text>
    </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Per-story tile wrapper — resolves S3 image
// ---------------------------------------------------------------------------

const EroticStoryItem = React.memo(({ item, authorMap, tagMap }: {
    item:      any;
    authorMap: Record<string, string>;
    tagMap:    Record<string, string>;
}) => {
    const { data: resolvedImageUri } = useStoryImage(
        item?.imageUri?.startsWith('stories/') ? item.imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? item?.imageUri ?? '';

    return (
        <View style={{ marginBottom: 12 }}>
            <StoryTile
                id={item.id}
                title={item.title}
                imageUri={displayImageUri}
                primaryTag={tagMap[item.primaryTagId ?? ''] ?? ''}
                audioUri={item.audioUri ?? ''}
                summary={item.summary ?? ''}
                description={item.description ?? ''}
                author={authorMap[item.authorId ?? ''] ?? ''}
                duration={item.duration ?? 0}
                numListens={item.numListens ?? 0}
            />
        </View>
    );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const EroticHomeScreen = () => {
    const navigation = useNavigation<any>();
    const insets     = useSafeAreaInsets();

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: eroticStories, isLoading: storiesLoading } = useEroticStories();
    const { data: allTags }   = useTags();
    const { data: authors }   = useAuthors();

    // Erotic sub-genre tags only
    const eroticTags = useMemo(
        () => (allTags ?? []).filter(t => t.isErotic),
        [allTags]
    );

    const authorMap = useMemo(() => {
        if (!authors) return {};
        return authors.reduce((acc: Record<string, string>, a) => {
            if (a.id && a.name) acc[a.id] = a.name;
            return acc;
        }, {});
    }, [authors]);

    const tagMap = useMemo(() => {
        if (!allTags) return {};
        return allTags.reduce((acc: Record<string, string>, t) => {
            if (t.id && t.name) acc[t.id] = t.name;
            return acc;
        }, {});
    }, [allTags]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>

            {/* Background gradient */}
            <LinearGradient
                colors={['#0d0400', '#000', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <AntDesign name="left" size={20} color='#fff' />
                </TouchableOpacity>

                <View style={styles.headerTitleRow}>
                    <Text style={styles.headerTitle}>Erotica</Text>
                </View>

                <View style={{ width: 36 }} />
            </View>

            {/* Content */}
            <FlatList
                data={eroticStories}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                renderItem={({ item }) => (
                    <EroticStoryItem
                        item={item}
                        authorMap={authorMap}
                        tagMap={tagMap}
                    />
                )}
                ListHeaderComponent={
                    <View>

                        {/* Continue listening — erotic stories only */}
                        <EroticContinueListening />

                        {/* Sub-genre tiles */}
                        {eroticTags.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Browse by Genre</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.genreRow}
                                >
                                    {eroticTags.map(tag => (
                                        <EroticGenreTile
                                            key={tag.id}
                                            tag={tag}
                                            navigation={navigation}
                                        />
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* All stories label */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>All Stories</Text>
                        </View>

                        {storiesLoading && (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator color={EROTIC_ORANGE} />
                            </View>
                        )}

                    </View>
                }
                ListEmptyComponent={
                    !storiesLoading ? (
                        <View style={styles.emptyState}>
                            <FontAwesome5
                                name={'fire' as any}
                                size={40}
                                color="rgba(255,124,42,0.2)"
                                iconStyle="solid"
                            />
                            <Text style={styles.emptyText}>No stories yet</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    root: {
        flex:            1,
        backgroundColor: '#000',
    },

    header: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom:  16,
    },
    backButton: {
        width:          36,
        height:         36,
        justifyContent: 'center',
        alignItems:     'center',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems:    'center',
    },
    headerTitle: {
        fontSize:   20,
        fontWeight: '800',
        color:      '#fff',
        letterSpacing: 0.3,
    },

    listContent: {
        paddingTop: 20,
    },

    section: {
        marginBottom:      16,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize:      13,
        fontWeight:    '700',
        color:         '#fff',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom:  12,
    },

    genreRow: {
        gap:         10,
        paddingRight: 20,
    },
    genreTile: {
        //width:           GENRE_TILE_W,
        //height:          GENRE_TILE_H,
        borderRadius:    20,
        overflow:        'hidden',
        borderWidth:     1,
        borderColor:     'rgba(255,124,42,0.2)',
        justifyContent:  'center',
        paddingHorizontal: 20,
        paddingVertical: 10,

    },
    genreTileName: {
        fontSize:   13,
        fontWeight: '400',
        color:      EROTIC_ORANGE,
        lineHeight: 18,
    },

    loadingRow: {
        paddingVertical:   32,
        alignItems:        'center',
    },
    emptyState: {
        alignItems:      'center',
        paddingVertical: 60,
        gap:             12,
    },
    emptyText: {
        color:    'rgba(255,124,42,0.4)',
        fontSize: 15,
    },
});

export default EroticHomeScreen;//this is a sandbox genre home screen for just the erotica genre
