import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet,
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

import StoryTile from './StoryTile';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useDeleteInProgressStory } from '../../hooks/queries/useInProgressStories';

const client = generateClient<Schema>();
const { width } = Dimensions.get('window');

const ProgressTile = ({
    inProgressRecord,
    tagMap,
    authorMap,
}: {
    inProgressRecord: any;
    tagMap: Record<string, string>;
    authorMap: Record<string, string>;
}) => {
    const [story, setStory] = useState<any>(null);
    const { mutate: deleteInProgress } = useDeleteInProgressStory();

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

    if (!story) return null;

    const progressSeconds = inProgressRecord.progressSeconds ?? 0;
    const duration        = story.duration ?? 1;
    const percent         = Math.min(100, Math.round((progressSeconds / duration) * 100));
    const secsLeft        = Math.max(0, duration - progressSeconds);
    const minsLeft        = Math.max(0, Math.floor(secsLeft / 60));

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

    return (
        <View>
            <StoryTile
                title={story.title}
                imageUri={displayImageUri}
                primaryTag={tagMap[story.primaryTagId ?? ''] ?? ''}
                audioUri={story.audioUri ?? ''}
                summary={story.summary ?? ''}
                author={authorMap[story.authorId ?? ''] ?? ''}
                description={story.description ?? ''}
                duration={story.duration ?? 0}
                id={story.id}
                numListens={story.numListens ?? 0}
            />

            {/* Progress bar + meta + delete */}
            <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFill, barStyle]} />
                </View>

                <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                        {percent}% · {minsLeft} min left
                    </Text>
                    <TouchableOpacity
                        onPress={() => deleteInProgress(story.id)}
                        activeOpacity={0.7}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <FontAwesome5
                            name="times"
                            size={12}
                            color="rgba(255,255,255,0.4)"
                            iconStyle="solid"
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    progressContainer: {
        marginHorizontal: 24,
        marginTop: -8,
        marginBottom: 12,
    },
    progressTrack: {
        height: 2,
        backgroundColor: '#2a2a2a',
        borderRadius: 1,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'cyan',
        borderRadius: 1,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
    },
    deleteBtn: {
        padding: 4,
    },
});

export default ProgressTile;