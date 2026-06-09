import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    ImageBackground,
    TouchableOpacity,
} from 'react-native';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Easing,
} from 'react-native-reanimated';

import Carousel       from 'react-native-reanimated-carousel';
import { LinearGradient } from 'expo-linear-gradient';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import FontAwesome  from '@react-native-vector-icons/fontawesome';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';

import PlayButtonV2 from '../common/PlayButtonV2';
import LoadingItem  from '../common/LoadingItem';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import PinButton from '../common/PinButton';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width, height } = Dimensions.get('window');

const CARD_WIDTH  = width * 0.9;
const CARD_HEIGHT = height * 0.40;
const EXPAND_H    = 120;
const TIMING_CFG  = { duration: 200, easing: Easing.out(Easing.quad) };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDuration(s: number): string {
    if (!s) return '';
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function fmtListens(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n ?? 0);
}

// ---------------------------------------------------------------------------
// CarouselItem
// ---------------------------------------------------------------------------

type ItemProps = {
    id:             string;
    title:          string;
    primaryTagName: string;
    summary:        string;
    imageUri:       string;
    audioUri:       string;
    author:         string;
    duration:       number;
    numListens:     number;
    avgRating?:     number | null;
    numRatings?:    number | null;
};

const CarouselItem = ({
    id, title, primaryTagName, summary,
    imageUri, audioUri, author, duration,
    numListens, avgRating, numRatings,
}: ItemProps) => {

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const { data: resolvedImageUri } = useStoryImage(
        imageUri?.startsWith('stories/') ? imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? imageUri;

    const expandProgress = useSharedValue(0);
    const isExpanded     = useSharedValue(false);

    const toggleExpand = () => {
        const next = !isExpanded.value;
        isExpanded.value     = next;
        expandProgress.value = withTiming(next ? 1 : 0, TIMING_CFG);
    };

    const expandStyle = useAnimatedStyle(() => ({
        height:  interpolate(expandProgress.value, [0, 1], [0, EXPAND_H]),
        opacity: interpolate(expandProgress.value, [0, 0.3], [0, 1]),
    }));

    const gradientStyle = useAnimatedStyle(() => ({
        height: interpolate(expandProgress.value, [0, 1], [CARD_HEIGHT * 0.68, CARD_HEIGHT]),
    }));

    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${interpolate(expandProgress.value, [0, 1], [0, 180])}deg` }],
    }));

    const hasRating = avgRating != null && avgRating > 0;

    return (
        <View style={styles.itemWrapper}>
            {displayImageUri ? (
                <ImageBackground
                    source={{ uri: displayImageUri }}
                    style={styles.card}
                    imageStyle={styles.cardImage}
                >
                    {/* Duration pill — top right */}
                    {duration > 0 && (
                        <View style={styles.durationPill} pointerEvents="none">
                            <FontAwesome5
                                name={'clock' as any}
                                size={9}
                                color="rgba(255,255,255,0.8)"
                                iconStyle="solid"
                            />
                            <Text style={styles.durationText}>{fmtDuration(duration)}</Text>
                        </View>
                    )}

                    <Animated.View
                        style={[styles.gradientContainer, gradientStyle]}
                        pointerEvents="none"
                    >
                        <LinearGradient
                            colors={[
                                'transparent',
                                'rgba(0,0,0,0.4)',
                                'rgba(0,0,0,0.88)',
                                'rgba(0,0,0,0.98)',
                            ]}
                            locations={[0, 0.3, 0.65, 1]}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('StoryScreen', { storyID: id })}
                        style={styles.imageTap}
                        activeOpacity={1}
                    />

                    <TouchableOpacity
                        onPress={toggleExpand}
                        activeOpacity={0.9}
                        style={styles.infoPanel}
                    >
                        {/* Title row */}
                        <View style={styles.titleRow}>
                            <Text style={styles.title} numberOfLines={2}>{title}</Text>
                            <Animated.View style={[styles.chevron, chevronStyle]}>
                                <FontAwesome5
                                    name="chevron-down"
                                    size={13}
                                    color="rgba(255,255,255,0.6)"
                                    iconStyle="solid"
                                />
                            </Animated.View>
                        </View>

                        {/* Author */}
                        <View style={styles.metaRow}>
                            <FontAwesome5
                                name="book-open"
                                size={10}
                                color="rgba(255,255,255,0.55)"
                                iconStyle="solid"
                            />
                            <Text style={styles.metaText}>{author}</Text>
                        </View>

                        {/* Stats row: tag · rating · listens */}
                        <View style={styles.metaRow}>
                            {primaryTagName ? (
                                <View style={styles.tagPill}>
                                    <Text style={styles.tagPillText}>{primaryTagName}</Text>
                                </View>
                            ) : null}

                            {hasRating && (
                                <>
                                    <View style={styles.metaDot} />
                                    <FontAwesome
                                        name={'star' as any}
                                        size={10}
                                        color="#C9A84C"
                                    />
                                    <Text style={[styles.metaText, { color: '#C9A84C' }]}>
                                        {(avgRating as number).toFixed(1)}
                                    </Text>
                                </>
                            )}

                            <View style={styles.metaDot} />
                            <FontAwesome5
                                name="headphones"
                                size={10}
                                color="rgba(255,255,255,0.5)"
                                iconStyle="solid"
                            />
                            <Text style={styles.metaText}>{fmtListens(numListens)}</Text>
                        </View>

                        {/* Expanded section */}
                        <Animated.View style={[styles.expandClip, expandStyle]}>
                            <View style={styles.expandInner}>
                                <Text style={styles.summary} numberOfLines={3}>
                                    {summary}
                                </Text>
                                <View style={styles.actions}>
                                    <PlayButtonV2
                                        id={id}
                                        duration={duration}
                                        author={author}
                                        audioUri={audioUri}
                                        imageUri={displayImageUri}
                                    />
                                    <View style={styles.iconActions}>
                                        <PinButton storyId={id} size={20} />
                                        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                                            <FontAwesome
                                                name="share"
                                                size={18}
                                                color="rgba(255,255,255,0.7)"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    </TouchableOpacity>

                </ImageBackground>
            ) : (
                <LoadingItem width={CARD_WIDTH} height={CARD_HEIGHT} radius={15} />
            )}
        </View>
    );
};

// ---------------------------------------------------------------------------
// ForYouCarousel
// ---------------------------------------------------------------------------

const ForYouCarousel = ({ stories, tagMap }: {
    stories: any[];
    tagMap:  Record<string, string>;
}) => {

    const renderItem = ({ item }: any) => (
        <CarouselItem
            id={item?.id}
            title={item?.title}
            imageUri={item?.imageUri ?? ''}
            primaryTagName={item?.primaryTagName ?? ''}
            audioUri={item?.audioUri ?? ''}
            summary={item?.summary ?? ''}
            author={item?.authorName ?? ''}
            duration={item?.duration ?? 0}
            numListens={item?.numListens ?? 0}
            avgRating={item?.avgRating}
            numRatings={item?.numRatings}
        />
    );

    return (
        <View style={styles.container}>
            <Carousel
                data={stories ?? []}
                renderItem={renderItem}
                width={width}
                height={CARD_HEIGHT}
                scrollAnimationDuration={1000}
                pagingEnabled
                snapEnabled
                mode="parallax"
                modeConfig={{
                    parallaxScrollingScale:    1,
                    parallaxScrollingOffset:   76,
                    parallaxAdjacentItemScale: 0.8,
                }}
                style={{ width }}
            />
        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    container: {
        alignItems: 'center',
        marginTop: 20,
    },
    itemWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    card: {
        width:           CARD_WIDTH,
        height:          CARD_HEIGHT,
        borderRadius:    15,
        overflow:        'hidden',
        justifyContent:  'flex-end',
        backgroundColor: '#171717',
    },
    cardImage: {
        borderRadius: 15,
    },

    // ── Duration pill ─────────────────────────────────────────────────────────
    durationPill: {
        position:       'absolute',
        top:            12,
        right:          12,
        flexDirection:  'row',
        alignItems:     'center',
        gap:            4,
        backgroundColor: 'rgba(0,0,0,0.65)',
        borderRadius:   20,
        paddingHorizontal: 8,
        paddingVertical:   4,
        borderWidth:    StyleSheet.hairlineWidth,
        borderColor:    'rgba(255,255,255,0.12)',
    },
    durationText: {
        fontSize:   11,
        fontWeight: '600',
        color:      'rgba(255,255,255,0.85)',
        letterSpacing: 0.3,
    },

    gradientContainer: {
        position: 'absolute',
        bottom: 0,
        left:   0,
        right:  0,
    },

    imageTap: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 100,
    },

    // ── Info panel ────────────────────────────────────────────────────────────
    infoPanel: {
        paddingHorizontal: 14,
        paddingTop:        10,
        paddingBottom:     10,
    },

    titleRow: {
        flexDirection:  'row',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        marginBottom:   5,
    },
    title: {
        flex:       1,
        fontSize:   17,
        fontWeight: '700',
        color:      '#fff',
        marginRight: 8,
        letterSpacing: 0.1,
    },
    chevron: {
        paddingTop: 3,
    },

    metaRow: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           5,
        marginBottom:  3,
    },
    metaText: {
        fontSize: 12,
        color:    'rgba(255,255,255,0.6)',
    },
    metaDot: {
        width:        3,
        height:       3,
        borderRadius: 1.5,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },

    tagPill: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius:    10,
        paddingHorizontal: 7,
        paddingVertical:   2,
    },
    tagPillText: {
        fontSize:      11,
        color:         'rgba(255,255,255,0.75)',
        fontWeight:    '600',
        textTransform: 'capitalize',
    },

    // ── Expanded ──────────────────────────────────────────────────────────────
    expandClip: {
        overflow:      'hidden',
        justifyContent: 'flex-end',
    },
    expandInner: {
        paddingVertical: 10,
        gap:             10,
        height:          '100%',
        justifyContent:  'space-between',
    },
    summary: {
        fontSize:  13,
        color:     'rgba(255,255,255,0.75)',
        lineHeight: 19,
    },
    actions: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
    },
    iconActions: {
        flexDirection: 'row',
        gap:           20,
        alignItems:    'center',
    },
    iconBtn: {
        padding: 4,
    },
});

export default ForYouCarousel;