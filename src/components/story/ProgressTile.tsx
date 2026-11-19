import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

import useOnPlay from '@/components/functions/OnPlay';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useAuthor } from '../../hooks/queries/useAuthors';
import { useDeleteInProgressStory } from '../../hooks/queries/useInProgressStories';
import { spacing } from '../../theme/spacing';
import { CachedImage } from '../common/CachedImage';
import SwipeActionRow, { type SwipeAction } from '../common/SwipeActionRow';
import { colors } from '@/theme/colors';
import { fontSizes, radius, iconSize } from '@/theme/tokens';
import { fmtTimeLeft } from '../../lib/storyDisplay';
import Icon from '@/components/common/Icon';

// One in-progress story, styled like a bookmark row: artwork, title, author, time left and a thin progress bar.
// Tap to continue; swipe left (or tap the grabber) to remove it from the list.
const ProgressTile = ({ inProgressRecord }: { inProgressRecord: any }) => {
    const story = inProgressRecord.story;
    const onPlay = useOnPlay('continue');
    const { mutate: deleteInProgress } = useDeleteInProgressStory();

    const { data: resolvedImageUri } = useStoryImage(story?.imageUri?.startsWith('stories/') ? story.imageUri : null);
    const art = resolvedImageUri ?? story?.imageUri ?? '';
    const { data: authorData } = useAuthor(story?.authorId ?? '');
    const authorName = authorData?.name ?? '';

    const progressSeconds = inProgressRecord.progressSeconds ?? 0;
    const duration        = story?.duration ?? 1;
    const percent         = Math.min(100, Math.round((progressSeconds / duration) * 100));
    const secsLeft        = Math.max(0, duration - progressSeconds);
    const minsLeft        = Math.floor(secsLeft / 60);

    const bar = useSharedValue(0);
    useEffect(() => { bar.value = withTiming(percent / 100, { duration: 600, easing: Easing.out(Easing.quad) }); }, [percent]);
    const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` as `${number}%` }));

    if (!story) return null;

    const remove = () => deleteInProgress(story.id);
    const actions: SwipeAction[] = [
        { key: 'delete', label: 'Remove', icon: 'trash', color: colors.dangerSolid, onPress: remove },
    ];

    return (
        <SwipeActionRow actions={actions}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onPlay({ id: story.id, title: story.title, url: story.audioUri ?? '', artwork: art, artist: authorName, isPremium: story.isPremium })}
                style={styles.tile}
                accessibilityRole="button"
                accessibilityLabel={`Continue ${story.title}${authorName ? `, by ${authorName}` : ''}, ${percent} percent played, ${minsLeft} minutes left`}
                accessibilityActions={[{ name: 'delete', label: 'Remove from continue listening' }]}
                onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'delete') remove(); }}
            >
                <CachedImage source={{ uri: art }} style={styles.artwork} />

                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={2}>{story.title}</Text>
                    <View style={styles.authorRow}>
                        <Icon name="book-open" weight="fill" size={iconSize.xs} color={colors.textSecondary} />
                        <Text style={styles.author} numberOfLines={1}>{authorName}</Text>
                    </View>
                    <Text style={styles.timeLeft}>{fmtTimeLeft(secsLeft)} · {percent}%</Text>
                    <View style={styles.track}>
                        <Animated.View style={[styles.fill, barStyle]} />
                    </View>
                </View>
            </TouchableOpacity>
        </SwipeActionRow>
    );
};

const styles = StyleSheet.create({
    tile: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: spacing.margin,
        paddingRight: 12,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.borderSubtle,
        gap: 12,
        backgroundColor: colors.surface0,
    },
    artwork: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surface3, flexShrink: 0 },
    content: { flex: 1, gap: 4 },
    title: { fontSize: fontSizes.small, fontWeight: '700', color: colors.textPrimary, lineHeight: 18 },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    author: { fontSize: fontSizes.caption, color: colors.textSecondary, flex: 1 },
    timeLeft: { fontSize: fontSizes.caption, color: colors.textSecondary },
    track: { height: 2, backgroundColor: colors.surface3, borderRadius: 1, overflow: 'hidden', marginTop: 2 },
    fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 1 },
});

export default ProgressTile;
