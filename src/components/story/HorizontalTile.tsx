import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ImageBackground,
    StyleSheet,
} from 'react-native';

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

function fmtListens(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n ?? 0);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HorzStoryTile = ({
    title,
    primaryTagName,
    imageUri,
    id,
    numListens,
    duration,
    avgRating,
}: any) => {

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const { data: resolvedImageUri } = useStoryImage(
        imageUri?.startsWith('stories/') ? imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? imageUri;

    const hasRating = avgRating != null && avgRating > 0;

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
                    {/* Duration pill — top right */}
                    {duration > 0 && (
                        <View style={styles.durationPill} pointerEvents="none">
                            <FontAwesome5
                                name={'clock' as any}
                                size={8}
                                color="rgba(255,255,255,0.85)"
                                iconStyle="solid"
                            />
                            <Text style={styles.durationText}>{fmtDuration(duration)}</Text>
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
                        {/* Tag */}
                        {primaryTagName ? (
                            <View style={styles.tagPill}>
                                <Text style={styles.tagPillText}>{primaryTagName}</Text>
                            </View>
                        ) : null}

                        {/* Title */}
                        <Text style={styles.title} numberOfLines={3}>
                            {title}
                        </Text>

                        {/* Stats row */}
                        <View style={styles.statsRow}>
                            {hasRating && (
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
                            )}
                            {hasRating && <View style={styles.dot} />}
                            <FontAwesome5
                                name="headphones"
                                size={9}
                                color="rgba(255,255,255,0.45)"
                                iconStyle="solid"
                            />
                            <Text style={styles.statText}>{fmtListens(numListens)}</Text>
                        </View>
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
    },
    cardImage: {
        borderRadius: 14,
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
        color:      'rgba(255,255,255,0.85)',
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
    dot: {
        width:        2,
        height:       2,
        borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    statText: {
        fontSize: 10,
        color:    'rgba(255,255,255,0.45)',
    },
});

export default HorzStoryTile;