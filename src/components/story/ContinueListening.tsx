import React, { useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    FlatList,
} from 'react-native';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Easing,
} from 'react-native-reanimated';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import useOnPlay from '@/components/functions/OnPlay';
import { spacing } from '../../theme/spacing';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width } = Dimensions.get('window');
const CARD_WIDTH    = width - spacing.margin * 2;
const CARD_GAP      = spacing.margin;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProgressEntry = {
    id: string;
    playbackPosition: number;
    story: {
        id: string;
        title: string;
        audioUri: string;
        imageUri: string;
        author: string;
        duration: number;
        primaryTag: string;
        summary: string;
    };
};

// ---------------------------------------------------------------------------
// ProgressCard
// ---------------------------------------------------------------------------

const ProgressCard = ({ entry }: { entry: ProgressEntry }) => {

    const onPlay = useOnPlay();

    const { story, playbackPosition } = entry;
    const percent  = Math.min(100, Math.round((playbackPosition / story.duration) * 100));
    const secsLeft = story.duration - playbackPosition;
    const minsLeft = Math.max(0, Math.floor(secsLeft / 60));

    // Animate progress bar on mount
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

    const handlePlay = () => onPlay({
        id: story.id,
        title: story.title,
        url: story.audioUri,
        artwork: story.imageUri,
        artist: story.author,
    });

    return (
        <TouchableOpacity
            activeOpacity={0.88}
            onPress={handlePlay}
            style={styles.card}
        >
            {/* Artwork */}
            <Image source={{ uri: story.imageUri }} style={styles.artwork} />

            {/* Info */}
            <View style={styles.info}>

                {/* Top — title, author, time left */}
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
                            {story.author}
                        </Text>
                    </View>

                    <Text style={styles.timeLeft}>
                        {minsLeft} min left · {percent}%
                    </Text>
                </View>

                {/* Bottom — progress bar */}
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

const ContinueListening = ({ story }: { story: ProgressEntry[] }) => {

    if (!story?.length) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Continue Listening</Text>

            <FlatList
                data={story}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <ProgressCard entry={item} />}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SNAP_INTERVAL}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
            />
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

    // Card
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

    // Progress bar
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
});

export default ContinueListening;