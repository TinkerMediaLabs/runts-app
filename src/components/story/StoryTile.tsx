import React from 'react';
import { View, TouchableWithoutFeedback, Image, StyleSheet, Share } from 'react-native';
import { Text } from '@/components/common/AppText';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Easing,
} from 'react-native-reanimated';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';

import PlayButtonV2 from '../common/PlayButtonV2';
import PinButton from '../common/PinButton';
import { useStoryProgressMap } from '../../hooks/queries/useStoryProgressMap';
import { useUniverse } from '../../hooks/queries/useUniverse';
import { getDurationDisplay } from '../../lib/storyDisplay';

// Animation config — quick and smooth
const TIMING = { duration: 220, easing: Easing.out(Easing.quad) };

const StoryTile = ({
    title,
    primaryTag,
    secondaryTag,
    summary,
    imageUri,
    nsfw,
    audioUri,
    author,
    duration,
    id,
    licenseType,
    universeId,
    sequenceNumber,
    reorderEnabled = false,
    drag,
    isActive,
    isLocked = false, 
    isPremium = false,
}: any) => {

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const progressMap = useStoryProgressMap();
    const progress = progressMap[id];
    const durationDisplay = getDurationDisplay(
        duration ?? 0,
        progress?.status ?? 'none',
        progress?.progressSeconds ?? 0
    );

    const { data: universe } = useUniverse(universeId);

    // 0 = collapsed, 1 = expanded
    const progressAnim = useSharedValue(0);
    const expanded = useSharedValue(false);

    const [expandedHeight, setExpandedHeight] = React.useState(300);

    const toggle = () => {
        if (reorderEnabled) return;
        const next = !expanded.value;
        expanded.value = next;
        progressAnim.value = withTiming(next ? 1 : 0, TIMING);
    };

    const handleShare = async () => {
        await Share.share({
            message: `Check out "${title}" on Runts: https://tinkermedia.net/runts/story/${id}`,
            url: `https://tinkermedia.net/runts/story/${id}`,
            title: title ?? 'Runts',
        });
    };

    // ── Animated styles ─────────────────────────────────────────────────────

    // Artwork shrinks to 0 width + fades as tile expands
    const artworkStyle = useAnimatedStyle(() => ({
        width:   interpolate(progressAnim.value, [0, 1], [60, 0]),
        opacity: interpolate(progressAnim.value, [0, 0.4], [1, 0]),
        marginRight: interpolate(progressAnim.value, [0, 1], [12, 0]),
    }));

    // Chevron rotates 180° on expand
    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${interpolate(progressAnim.value, [0, 1], [0, 180])}deg` }],
    }));

    // Expanded section clips in from height 0
    const expandedStyle = useAnimatedStyle(() => ({
        height:  interpolate(progressAnim.value, [0, 1], [0, expandedHeight]),
        opacity: interpolate(progressAnim.value, [0, 0.3], [0, 1]),
    }));

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={[styles.wrapper, isActive && styles.wrapperActive]}>

            {/* Drag handle */}
            {reorderEnabled && (
                <TouchableOpacity
                    onLongPress={drag}
                    activeOpacity={0.6}
                    style={styles.dragHandle}
                >
                    <FontAwesome5 name="grip-lines" size={16} color="#ffffff30" iconStyle="solid" />
                </TouchableOpacity>
            )}

            <View style={styles.card}>

                    {/* ── Header row — tap here to expand/collapse ── */}
                    <TouchableOpacity onPress={toggle} activeOpacity={0.85} style={styles.row}>

                        {/* Artwork — animates to 0 width on expand */}
                        <Animated.Image
                            source={{ uri: imageUri }}
                            style={[styles.artwork, artworkStyle]}
                        />

                        {/* Text block — flex:1 so it fills the space left by artwork */}
                        <View style={styles.textBlock}>
                            <Text style={styles.title} numberOfLines={2}>{title}</Text>

                             {/* Universe / Sequence Number */}
                            {(universe?.name || sequenceNumber) ? (
                                <View style={styles.universeRow}>

                                     {sequenceNumber ? (
                                        <Text style={styles.universeText}>Part {sequenceNumber}</Text>
                                    ) : null}

                                    {universe?.name && sequenceNumber ? (
                                        <Text style={styles.universeDot}>·</Text>
                                    ) : null}
            
                                     {universe?.name ? (
                                        <Text style={styles.universeText}>{universe.name} UNIVERSE</Text>
                                    ) : null}
                                   
                                </View>
                            ) : null}

                            <View style={styles.metaRow}>
                                <FontAwesome5 name="book-open" size={11} color="#ffffff50" iconStyle="solid" />
                                <Text style={styles.author} numberOfLines={1}>{author}</Text>
                            </View>

                            <View style={styles.infoRow}>
                        {/* Duration — replaces numListens/headphones */}
                            {duration > 0 && (
                                <View style={styles.metaRow}>
                                    <FontAwesome5
                                        name={durationDisplay.icon}
                                        size={11}
                                        color={durationDisplay.color}
                                        iconStyle="solid"
                                    />
                                    <Text style={[styles.durationText, { color: durationDisplay.color }]}>
                                        {durationDisplay.text}
                                    </Text>
                                </View>
                            )}
                            {/* Tag pills — moved here from expanded view */}
                            {(primaryTag || secondaryTag) ? (
                                <View style={styles.tagRow}>
                                    {primaryTag ? (
                                        <View style={styles.tagPill}>
                                            <Text style={styles.tagPillText}>{primaryTag}</Text>
                                        </View>
                                    ) : null}
                                    {secondaryTag ? (
                                        <View style={styles.tagPill}>
                                            <Text style={styles.tagPillText}>{secondaryTag}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            ) : null}
                            </View>
                            
                        </View>

                        {/* Chevron */}
                        <Animated.View style={[styles.chevron, chevronStyle]}>
                            <FontAwesome5
                                name="chevron-down"
                                size={11}
                                color="#ffffff30"
                                iconStyle="solid"
                            />
                        </Animated.View>
                    </TouchableOpacity>

                    {/* ── Expanded section — clips in from height 0 ── */}
                    <Animated.View style={[styles.expandedClip, expandedStyle]}>
                        <View 
                            style={styles.expandedInner}
                            onLayout={e => setExpandedHeight(e.nativeEvent.layout.height)}
                        >

                            {/* Full artwork → story screen */}
                            <TouchableWithoutFeedback
                                onPress={() => navigation.navigate('StoryScreen', { storyID: id })}
                            >
                                <View>
                                    <Image
                                        source={{ uri: imageUri }}
                                        style={styles.expandedImage}
                                        resizeMode="cover"
                                    />
                                    {licenseType === 'runts_exclusive' && (
                                        <View style={styles.ogBadge} pointerEvents="none">
                                            <Image
                                                source={require('../../../assets/images/icon24w.png')}
                                                style={styles.ogBadgeIcon}
                                            />
                                        </View>
                                    )}
                                </View>
                            </TouchableWithoutFeedback>

                            {/* Summary */}
                            {summary ? (
                                <Text style={styles.summary} numberOfLines={3}>{summary}</Text>
                            ) : null}

                            {/* Actions */}
                            <View style={styles.actions}>
                                <View style={styles.actionsLeft}>
                                    <PinButton storyId={id} size={20} />

                                    <TouchableOpacity onPress={handleShare} style={styles.actionBtn} activeOpacity={0.7}>
                                        <FontAwesome5 name="share" size={19} color="#ffffff70" iconStyle="solid" />
                                    </TouchableOpacity>
                                </View>
                                    <PlayButtonV2
                                        duration={duration}
                                        id={id}
                                        author={author}
                                        imageUri={imageUri}
                                        audioUri={audioUri}
                                        isPremium={isPremium}
                                    />
                            </View>

                        </View>
                    </Animated.View>

            </View>
        </View>
    );
};

const styles = StyleSheet.create({

    wrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginVertical: 4,
    },
    wrapperActive: {
        opacity: 0.9,
    },
    dragHandle: {
        width: 32,
        paddingVertical: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    card: {
        flex: 1,
        backgroundColor: '#1c1c1c',
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: '#2a2a2a',
        overflow: 'hidden',
    },

    // Header row
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    artwork: {
        height: 60,
        borderRadius: 10,
        backgroundColor: '#2a2a2a',
        alignSelf: 'flex-start',
        // width is animated — don't set it here
    },
    textBlock: {
        flex: 1,
        gap: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginRight: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    author: {
        fontSize: 12,
        color: '#ffffffa5',
        flex: 1,
    },
    durationText: {
        fontSize: 12,
        fontWeight: '600',
    },
    chevron: {
        paddingLeft: 10,
    },

    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tagPill: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    tagPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.75)',
        textTransform: 'capitalize',
    },

    // Expanded — overflow:hidden on the Animated.View clips the content
    expandedClip: {
        overflow: 'hidden',
    },
    expandedInner: {
       borderTopColor: '#2a2a2a',
        paddingTop: 6,
        paddingHorizontal: 12,
        paddingBottom: 16,
        gap: 10,
    },
    expandedImage: {
        width: '100%',
        height: 200,
        borderRadius: 10,
    },
    ogBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 20,
        padding: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,255,255,0.4)',
    },
    ogBadgeIcon: {
        width: 16,
        height: 16,
    },
    universeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    universeText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#ffffffa5',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    universeDot: {
        color: 'rgba(0,255,255,0.4)',
        fontSize: 13,
    },
    summary: {
        fontSize: 13,
        color: '#ffffffa5',
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    actionsLeft: {
        flexDirection: 'row',
        gap: 20,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

});

export default StoryTile;