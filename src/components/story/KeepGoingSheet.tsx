import React, { useEffect } from 'react';
import { View, Modal, TouchableOpacity, TouchableWithoutFeedback, Image, StyleSheet, AccessibilityInfo } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayer } from '@/context/PlayerContext';
import { useApp } from '@/context/AppContext';
import { navigate } from '@/navigation/RootNavigator';
import { useStory } from '../../hooks/queries/useStories';
import { useRecommendations } from '../../hooks/queries/useRecommendations';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { fmtDuration } from '../../lib/storyDisplay';

const MAX_ROWS = 4;

const REASON_TEXT: Record<string, string> = {
    'next-part': 'Next in the series',
    universe: 'Same universe',
    author: 'Same author',
    tag: 'Similar story',
};

const Row = ({ item, onPress }: { item: any; onPress: () => void }) => {
    const { data: resolved } = useStoryImage(item.imageUri?.startsWith('stories/') ? item.imageUri : null);
    const uri = resolved ?? item.imageUri;
    const duration = item.duration ? fmtDuration(item.duration) : '';
    const meta = [REASON_TEXT[item.reason], item.authorName, duration].filter(Boolean).join(' · ');
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${meta}`}
            accessibilityHint="Opens the story"
        >
            {uri ? (
                <Image source={{ uri }} style={styles.thumb} accessible={false} />
            ) : (
                <View style={[styles.thumb, { backgroundColor: '#1a1a1a' }]} />
            )}
            <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.rowMeta}>{meta}</Text>
            </View>
        </TouchableOpacity>
    );
};

// Shown after a story ends with nothing queued to autoplay (instead of the player simply closing).
// Waits for the rating popup to finish first, and never shows while something is playing.
const KeepGoingSheet = () => {
    const { state, keepGoingStoryId, dismissKeepGoing } = usePlayer();
    const { eroticEnabled } = useApp();
    const insets = useSafeAreaInsets();

    const { data: story } = useStory(keepGoingStoryId ?? '');
    const { items, isLoading } = useRecommendations(keepGoingStoryId ? story : null, eroticEnabled, MAX_ROWS);

    const visible = !!keepGoingStoryId && !state.pendingRatingStoryId && !state.currentTrack && items.length > 0;

    // Nothing to suggest: fall back to the finished story's page (what used to happen after rating).
    useEffect(() => {
        if (!keepGoingStoryId || state.pendingRatingStoryId || state.currentTrack) return;
        if (!story || isLoading || items.length > 0) return;
        const id = keepGoingStoryId;
        dismissKeepGoing();
        navigate('StoryScreen', { storyID: id });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keepGoingStoryId, state.pendingRatingStoryId, state.currentTrack, story, isLoading, items.length]);

    useEffect(() => {
        if (visible) AccessibilityInfo.announceForAccessibility('Keep going. Suggestions for what to listen to next.');
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal visible transparent animationType="slide" onRequestClose={dismissKeepGoing}>
            <TouchableWithoutFeedback onPress={dismissKeepGoing} accessibilityRole="button" accessibilityLabel="Close suggestions">
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} accessibilityViewIsModal>
                <View style={styles.handle} />
                <Text style={styles.title} accessibilityRole="header">Keep going</Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                    You just finished {story?.title ?? 'a story'}. Here is what to listen to next.
                </Text>
                {items.slice(0, MAX_ROWS).map((item: any) => (
                    <Row
                        key={item.id}
                        item={item}
                        onPress={() => {
                            dismissKeepGoing();
                            navigate('StoryScreen', { storyID: item.id });
                        }}
                    />
                ))}
                <TouchableOpacity
                    onPress={dismissKeepGoing}
                    style={styles.notNow}
                    accessibilityRole="button"
                    accessibilityLabel="Not now"
                >
                    <Text style={styles.notNowText}>Not now</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
        backgroundColor: '#111',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    handle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#333',
        marginBottom: 16,
    },
    title: { fontSize: 20, fontWeight: '700', color: '#fff' },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 64 },
    thumb: { width: 56, height: 56, borderRadius: 10 },
    rowTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
    rowMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    notNow: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 24, marginTop: 8 },
    notNowText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
});

export default KeepGoingSheet;
