import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    NativeScrollEvent,
    NativeSyntheticEvent,
} from 'react-native';

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
import { useAuthors } from '../../hooks/queries/useAuthors';

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
    authorMap,
}: {
    inProgressRecord: any;
    authorMap: Record<string, string>;
}) => {
    const onPlay = useOnPlay();
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
    const authorName      = authorMap[story?.authorId ?? ''] ?? '';

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
        >
            <Image source={{ uri: displayImageUri }} style={styles.artwork} />

            <View style={styles.info}>
                <View style={styles.infoTop}>
                    <Text style={styles.title} numberOfLines={2}>
                        {story.title}
                    </Text>

                    <View style={styles.authorRow}>
                        <FontAwesome5
                            name="book-open"
                            size={11}
                            color="rgba(255,255,255,0.6)"
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

    const { data: inProgressStories, isLoading } = useInProgressStories();
    const { data: authors } = useAuthors();
    const [activeIndex, setActiveIndex] = useState(0);

    const authorMap = useMemo(() => {
        if (!authors) return {};
        return authors.reduce((acc: Record<string, string>, author) => {
            if (author.id && author.name) acc[author.id] = author.name;
            return acc;
        }, {});
    }, [authors]);

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
            <Text style={styles.sectionTitle}>Continue Listening</Text>

            <FlatList
                data={recentStories}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <ProgressCard
                        inProgressRecord={item}
                        authorMap={authorMap}
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        paddingHorizontal: spacing.margin,
        letterSpacing: 0.2,
    },
    listContent: {
        paddingHorizontal: spacing.margin,
        paddingBottom: 4,
    },
    card: {
        width: CARD_WIDTH,
        flexDirection: 'row',
        backgroundColor: '#1c1c1c',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        overflow: 'hidden',
    },
    artwork: {
        width: 90,
        height: 90,
        backgroundColor: '#2a2a2a',
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
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        lineHeight: 18,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    author: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.55)',
        flex: 1,
    },
    timeLeft: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.45)',
    },
    progressTrack: {
        height: 2,
        backgroundColor: '#333',
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'cyan',
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
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dotActive: {
        width: 16,
        borderRadius: 3,
        backgroundColor: 'cyan',
    },
});

export default ContinueListening;