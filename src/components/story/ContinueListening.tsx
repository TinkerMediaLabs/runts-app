import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, FlatList, ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Text } from '@/components/common/AppText';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Easing,
} from 'react-native-reanimated';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

import useOnPlay from '@/components/functions/OnPlay';
import { spacing } from '../../theme/spacing';
import { useInProgressStories } from '../../hooks/queries/useInProgressStories';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useAuthor } from '../../hooks/queries/useAuthors';

import { CachedImage } from '../common/CachedImage';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';
import SectionTitle from '@/components/common/SectionTitle';
const client = generateClient<Schema>();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width } = Dimensions.get('window');
const CARD_WIDTH    = width - spacing.margin * 2;
const CARD_GAP      = spacing.margin;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const MAX_CARDS     = 4;

// ---------------------------------------------------------------------------
// ProgressCard — fetches its own story data
// ---------------------------------------------------------------------------

const ProgressCard = ({
    inProgressRecord,
}: {
    inProgressRecord: any;
}) => {
    const onPlay = useOnPlay('continue');
    const [story, setStory] = useState<any>(null);

    useEffect(() => {
        async function fetchStory() {
            try {
                const { data } = await client.models.Story.get({ id: inProgressRecord.storyId });
                setStory(data);
            } catch (e) {
                console.log('Error fetching in-progress story:', e);
            }
        }
        fetchStory();
    }, [inProgressRecord.storyId]);

    const { data: resolvedImageUri } = useStoryImage(
        story?.imageUri?.startsWith('stories/') ? story.imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? story?.imageUri ?? '';

    // Derived values — safe to compute when story is null
    const progressSeconds = inProgressRecord.progressSeconds ?? 0;
    const duration        = story?.duration ?? 1;
    const percent         = Math.min(100, Math.round((progressSeconds / duration) * 100));
    const secsLeft        = Math.max(0, duration - progressSeconds);
    const minsLeft        = Math.max(0, Math.floor(secsLeft / 60));
    const { data: authorData } = useAuthor(story?.authorId ?? '');
    const authorName      = authorData?.name ?? '';

    // All hooks above early return
    const barProgress = useSharedValue(0);
    useEffect(() => {
        barProgress.value = withTiming(percent / 100, {
            duration: 600,
            easing: Easing.out(Easing.quad),
        });
    }, [percent]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${interpolate(barProgress.value, [0, 1], [0, 100])}%` as `${number}%`,
    }));

    // Early return AFTER all hooks
    if (!story) return null;

    const handlePlay = () => onPlay({
        id: story.id,
        title: story.title,
        url: story.audioUri ?? '',
        artwork: displayImageUri,
        artist: authorName,
    });

    return (
        <TouchableOpacity
            activeOpacity={0.88}
            onPress={handlePlay}
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={`Continue ${story.title}${authorName ? `, by ${authorName}` : ''}, ${percent} percent played, ${minsLeft} minutes left`}
        >
            <CachedImage source={{ uri: displayImageUri }} style={styles.artwork} />

            <View style={styles.info}>
                <View style={styles.infoTop}>
                    <Text style={styles.title} numberOfLines={2}>
                        {story.title}
                    </Text>

                    <View style={styles.authorRow}>
                        <FontAwesome5
                            name="book-open"
                            size={iconSize.xs}
                            color={colors.textSecondary}
                            iconStyle="solid"
                        />
                        <Text style={styles.author} numberOfLines={1}>
                            {authorName}
                        </Text>
                    </View>

                    <Text style={styles.timeLeft}>
                        {minsLeft} min left · {percent}%
                    </Text>
                </View>

                <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFill, barStyle]} />
                </View>
            </View>
        </TouchableOpacity>
    );
};

// ---------------------------------------------------------------------------
// ContinueListening
// ---------------------------------------------------------------------------

const ContinueListening = () => {

    const { data: inProgressStories, isLoading } = useInProgressStories(MAX_CARDS);
    const [activeIndex, setActiveIndex] = useState(0);

    const recentStories = useMemo(() => {
        return (inProgressStories ?? []).slice(0, MAX_CARDS);
    }, [inProgressStories]);

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = e.nativeEvent.contentOffset.x;
        const index  = Math.round(offset / SNAP_INTERVAL);
        setActiveIndex(Math.min(index, recentStories.length - 1));
    };

    if (isLoading) return null;
    if (!recentStories.length) return null;

    return (
        <View style={styles.container}>
            <SectionTitle text="Continue Listening" />

            <FlatList
                data={recentStories}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <ProgressCard
                        inProgressRecord={item}
                    />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SNAP_INTERVAL}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            />

            {/* Pagination dots — only shown when there are multiple cards */}
            {recentStories.length > 1 && (
                <View style={styles.dotsRow}>
                    {recentStories.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === activeIndex && styles.dotActive,
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        marginBottom: 8,
    },
    listContent: {
        paddingHorizontal: spacing.margin,
        paddingBottom: 4,
    },
    card: {
        width: CARD_WIDTH,
        flexDirection: 'row',
        backgroundColor: colors.surface2,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    artwork: {
        width: 90,
        height: 90,
        backgroundColor: colors.surface3,
    },
    info: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        justifyContent: 'space-between',
    },
    infoTop: {
        gap: 4,
    },
    title: {
        fontSize: fontSizes.small,
        fontWeight: '700',
        color: colors.textPrimary,
        lineHeight: 18,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    author: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
        flex: 1,
    },
    timeLeft: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
    },
    progressTrack: {
        height: 2,
        backgroundColor: colors.surface3,
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 1,
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        marginTop: 10,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.fillStrong,
    },
    dotActive: {
        width: 5,
        borderRadius: 3,
        backgroundColor: colors.accent,
    },
});

export default ContinueListening;