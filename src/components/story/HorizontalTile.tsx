import React from 'react';
import { View, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import FontAwesome  from '@react-native-vector-icons/fontawesome';
import { LinearGradient } from 'expo-linear-gradient';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';

import LoadingItem from '../common/LoadingItem';
import { spacing } from '../../theme/spacing';
import { useStoryImage } from '../../hooks/queries/useStoryImage';

const CARD_WIDTH  = 200;
const CARD_HEIGHT = 240;

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

type ProgressStatus = 'none' | 'in_progress' | 'completed';

function getDurationDisplay(duration: number, progressStatus: ProgressStatus, progressSeconds: number) {
    if (progressStatus === 'completed') {
        return { text: fmtDuration(duration), color: '#4ADE80', icon: 'check-circle' as const };
    }
    if (progressStatus === 'in_progress') {
        const remaining = Math.max(0, duration - (progressSeconds ?? 0));
        return { text: `${fmtDuration(remaining)} left`, color: 'cyan', icon: 'clock' as const };
    }
    return { text: fmtDuration(duration), color: 'rgba(255,255,255,0.85)', icon: 'clock' as const };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HorzStoryTile = ({
    title,
    primaryTagName,
    secondaryTagName,
    imageUri,
    id,
    duration,
    avgRating,
    author,
    isNew,
    progressStatus = 'none',
    progressSeconds = 0,
}: any) => {

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const { data: resolvedImageUri } = useStoryImage(
        imageUri?.startsWith('stories/') ? imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? imageUri;

    const hasRating = avgRating != null && avgRating > 0;
    const durationDisplay = getDurationDisplay(duration, progressStatus, progressSeconds);

    return (
        <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('StoryScreen', { storyID: id })}
            style={styles.wrapper}
        >
            {displayImageUri ? (
                <ImageBackground
                    source={{ uri: displayImageUri }}
                    style={styles.card}
                    imageStyle={styles.cardImage}
                >
                    {/* NEW badge — top left */}
                    {isNew && (
                        <View style={styles.newBadge} pointerEvents="none">
                            <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                    )}

                    {/* Duration / progress pill — top right */}
                    {duration > 0 && (
                        <View style={styles.durationPill} pointerEvents="none">
                            <FontAwesome5
                                name={durationDisplay.icon}
                                size={8}
                                color={durationDisplay.color}
                                iconStyle="solid"
                            />
                            <Text style={[styles.durationText, { color: durationDisplay.color }]}>
                                {durationDisplay.text}
                            </Text>
                        </View>
                    )}

                    <LinearGradient
                        colors={[
                            'transparent',
                            'rgba(0,0,0,0.3)',
                            'rgba(0,0,0,0.82)',
                            'rgba(0,0,0,0.97)',
                        ]}
                        locations={[0.2, 0.45, 0.75, 1]}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                    />

                    <View style={styles.info}>
                        {/* Title */}
                        <Text style={styles.title} numberOfLines={3}>
                            {title}
                        </Text>

                        {/* Author */}
                        {author ? (
                            <View style={styles.authorRow}>
                                <FontAwesome5
                                    name="book-open"
                                    size={9}
                                    color="rgba(255,255,255,0.5)"
                                    iconStyle="solid"
                                />
                                <Text style={styles.authorText} numberOfLines={1}>{author}</Text>
                            </View>
                        ) : null}

                        {/* Tags */}
                        {(primaryTagName || secondaryTagName) ? (
                            <View style={styles.tagRow}>
                                {primaryTagName ? (
                                    <View style={styles.tagPill}>
                                        <Text style={styles.tagPillText}>{primaryTagName}</Text>
                                    </View>
                                ) : null}
                                {secondaryTagName ? (
                                    <View style={styles.tagPill}>
                                        <Text style={styles.tagPillText}>{secondaryTagName}</Text>
                                    </View>
                                ) : null}
                            </View>
                        ) : null}

                        {/* Rating (listens removed entirely for this tile) */}
                        {hasRating && (
                            <View style={styles.statsRow}>
                                <View style={styles.ratingRow}>
                                    <FontAwesome
                                        name={'star' as any}
                                        size={9}
                                        color="#C9A84C"
                                    />
                                    <Text style={styles.ratingText}>
                                        {(avgRating as number).toFixed(1)}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </ImageBackground>
            ) : (
                <LoadingItem height={CARD_HEIGHT} width={CARD_WIDTH} radius={14} />
            )}
        </TouchableOpacity>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    wrapper: {
        marginLeft: spacing.margin,
    },
    card: {
        width:           CARD_WIDTH,
        height:          CARD_HEIGHT,
        borderRadius:    14,
        overflow:        'hidden',
        justifyContent:  'flex-end',
        backgroundColor: '#1c1c1c',
        borderWidth:     0.5,
        borderColor:     'rgba(255,255,255,0.1)',
    },
    cardImage: {
        borderRadius: 14,
    },

    // ── NEW badge ──────────────────────────────────────────────────────────────
    newBadge: {
        position:       'absolute',
        top:            10,
        left:           10,
        backgroundColor: 'cyan',
        borderRadius:   20,
        paddingHorizontal: 7,
        paddingVertical:   3,
        zIndex: 2,
    },
    newBadgeText: {
        fontSize:   9,
        fontWeight: '800',
        color:      '#000',
        letterSpacing: 0.4,
    },

    // ── Duration pill ─────────────────────────────────────────────────────────
    durationPill: {
        position:       'absolute',
        top:            10,
        right:          10,
        flexDirection:  'row',
        alignItems:     'center',
        gap:            3,
        backgroundColor: 'rgba(0,0,0,0.62)',
        borderRadius:   20,
        paddingHorizontal: 7,
        paddingVertical:   3,
        borderWidth:    StyleSheet.hairlineWidth,
        borderColor:    'rgba(255,255,255,0.1)',
    },
    durationText: {
        fontSize:   10,
        fontWeight: '600',
        letterSpacing: 0.2,
    },

    // ── Info panel ────────────────────────────────────────────────────────────
    info: {
        paddingHorizontal: 10,
        paddingBottom:     10,
        gap:               5,
    },

    tagPill: {
        alignSelf:       'flex-start',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius:    8,
        paddingHorizontal: 6,
        paddingVertical:   2,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    authorText: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        flexShrink: 1,
    },
    tagPillText: {
        fontSize:      10,
        fontWeight:    '600',
        color:         'rgba(255,255,255,0.7)',
        textTransform: 'capitalize',
    },

    title: {
        fontSize:   14,
        fontWeight: '700',
        color:      '#fff',
        lineHeight: 18,
        flexShrink: 1,
    },

    statsRow: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           3,
    },
    ratingText: {
        fontSize:   10,
        color:      '#C9A84C',
        fontWeight: '600',
    },
});

export default HorzStoryTile;