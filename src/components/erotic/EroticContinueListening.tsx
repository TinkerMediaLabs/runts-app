import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useQuery } from '@tanstack/react-query';

import { useEroticInProgressStories } from '@/hooks/queries/useInProgressStories';
import { useStoryImage }              from '@/hooks/queries/useStoryImage';
import { usePlayer }                  from '@/context/PlayerContext';

const client  = generateClient<Schema>();
const { width } = Dimensions.get('window');
const TILE_W  = 160;
const TILE_H  = 100;

// ---------------------------------------------------------------------------
// Per-tile — fetches own story data
// ---------------------------------------------------------------------------

const EroticContinueTile = ({ storyId, progressSeconds }: {
    storyId:         string;
    progressSeconds: number;
}) => {
    const navigation = useNavigation<any>();
    const { playTrack } = usePlayer();

    const { data: story } = useQuery({
        queryKey: ['story', storyId],
        queryFn:  async () => {
            const { data } = await client.models.Story.get({ id: storyId });
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });

    const { data: resolvedImageUri } = useStoryImage(
        story?.imageUri?.startsWith('stories/') ? story.imageUri : null
    );
    const imageUri = resolvedImageUri ?? story?.imageUri ?? '';

    if (!story) return null;

    const duration    = story.duration ?? 1;
    const progress    = Math.min((progressSeconds / duration) * 100, 100);
    const remaining   = Math.max(duration - progressSeconds, 0);
    const remainingMn = Math.ceil(remaining / 60);

    const handlePress = () => {
        navigation.navigate('StoryDetails', { id: storyId });
    };

    const handlePlay = () => {
        playTrack({
            id:      story.id,
            title:   story.title ?? '',
            url:     story.audioUri ?? '',
            artwork: imageUri,
            artist:  '',
        });
    };

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePress}
            style={styles.tile}
        >
            {/* Cover image */}
            <Image
                source={imageUri ? { uri: imageUri } : require('../../../assets/images/blankprofile.png')}
                style={styles.tileImage}
            />

            {/* Orange overlay gradient at bottom */}
            <View style={styles.tileOverlay} />

            {/* Progress bar */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
            </View>

            {/* Info */}
            <View style={styles.tileInfo}>
                <Text style={styles.tileTitle} numberOfLines={1}>{story.title}</Text>
                <Text style={styles.tileRemaining}>{remainingMn}m left</Text>
            </View>
        </TouchableOpacity>
    );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EroticContinueListening = () => {
    const { data: records, isLoading } = useEroticInProgressStories();

    if (isLoading) {
        return (
            <View style={styles.loadingRow}>
                <ActivityIndicator color="#ff7c2a" size="small" />
            </View>
        );
    }

    if (!records?.length) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Continue Listening</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {records.map(record => (
                    <EroticContinueTile
                        key={record.id}
                        storyId={record.storyId}
                        progressSeconds={record.progressSeconds ?? 0}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize:       13,
        fontWeight:     '700',
        color:          'rgba(255,124,42,0.7)',
        textTransform:  'uppercase',
        letterSpacing:  0.8,
        marginBottom:   12,
        paddingHorizontal: 20,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    loadingRow: {
        paddingVertical:   20,
        paddingHorizontal: 20,
    },

    tile: {
        width:           TILE_W,
        height:          TILE_H,
        borderRadius:    12,
        overflow:        'hidden',
        borderWidth:     1,
        borderColor:     'rgba(255,124,42,0.2)',
    },
    tileImage: {
        width:  TILE_W,
        height: TILE_H,
        position: 'absolute',
    },
    tileOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    progressTrack: {
        position:        'absolute',
        bottom:          0,
        left:            0,
        right:           0,
        height:          3,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    progressFill: {
        height:          3,
        backgroundColor: '#ff7c2a',
    },
    tileInfo: {
        position:        'absolute',
        bottom:          8,
        left:            8,
        right:           8,
    },
    tileTitle: {
        fontSize:   12,
        fontWeight: '700',
        color:      '#fff',
        marginBottom: 2,
    },
    tileRemaining: {
        fontSize: 10,
        color:    'rgba(255,124,42,0.8)',
    },
});

export default EroticContinueListening;