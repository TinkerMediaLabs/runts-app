import React from 'react';
import {
    View,
    Text,
    TouchableWithoutFeedback,
    Image,
    StyleSheet,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Easing,
} from 'react-native-reanimated';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import AntDesign from '@react-native-vector-icons/ant-design';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';

import PlayButtonV2 from '../common/PlayButtonV2';
import PinButton from '../common/PinButton';

// Animation config — quick and smooth
const TIMING = { duration: 220, easing: Easing.out(Easing.quad) };

// Expanded content height — fixed so we can animate it cleanly
const EXPANDED_HEIGHT = 288;

const StoryTile = ({
    title,
    primaryTag,
    summary,
    imageUri,
    nsfw,
    audioUri,
    author,
    duration,
    id,
    numListens,
    reorderEnabled = false,
    drag,
    isActive,
}: any) => {

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    // 0 = collapsed, 1 = expanded
    const progress = useSharedValue(0);
    const expanded = useSharedValue(false);

    const [isFav, setIsFav] = React.useState(false);

    const toggle = () => {
        if (reorderEnabled) return;
        const next = !expanded.value;
        expanded.value = next;
        progress.value = withTiming(next ? 1 : 0, TIMING);
    };

    const onFavPress = () => setIsFav(f => !f);

    // ── Animated styles ─────────────────────────────────────────────────────

    // Artwork shrinks to 0 width + fades as tile expands
    const artworkStyle = useAnimatedStyle(() => ({
        width:   interpolate(progress.value, [0, 1], [60, 0]),
        opacity: interpolate(progress.value, [0, 0.4], [1, 0]),
        marginRight: interpolate(progress.value, [0, 1], [12, 0]),
    }));

    // Chevron rotates 180° on expand
    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
    }));

    // Expanded section clips in from height 0
    const expandedStyle = useAnimatedStyle(() => ({
        height:  interpolate(progress.value, [0, 1], [0, EXPANDED_HEIGHT]),
        opacity: interpolate(progress.value, [0, 0.3], [0, 1]),
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

                            <View style={styles.metaRow}>
                                <FontAwesome5 name="book-open" size={11} color="#ffffff50" iconStyle="solid" />
                                <Text style={styles.author} numberOfLines={1}>{author}</Text>
                            </View>

                            <View style={styles.metaRow}>
                                <Text style={styles.tag}>{primaryTag}</Text>
                                <View style={styles.dot} />
                                <FontAwesome5 name="headphones" size={11} color="#ffffff40" iconStyle="solid" />
                                <Text style={styles.listenCount}>{numListens ?? 0}</Text>
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
                        <View style={styles.expandedInner}>

                            {/* Full artwork → story screen */}
                            <TouchableWithoutFeedback
                                onPress={() => navigation.navigate('StoryScreen', { storyID: id })}
                            >
                                <Image
                                    source={{ uri: imageUri }}
                                    style={styles.expandedImage}
                                    resizeMode="cover"
                                />
                            </TouchableWithoutFeedback>

                            {/* Summary */}
                            {summary ? (
                                <Text style={styles.summary} numberOfLines={3}>{summary}</Text>
                            ) : null}

                            {/* Actions */}
                            <View style={styles.actions}>
                                <View style={styles.actionsLeft}>
                                    <PinButton storyId={id} size={20} />

                                    <TouchableOpacity
                                        onPress={onFavPress}
                                        style={styles.actionBtn}
                                        activeOpacity={0.7}
                                    >
                                        <FontAwesome5
                                            name="star"
                                            size={19}
                                            color={isFav ? '#C9A84C' : '#ffffff70'}
                                            iconStyle={isFav ? 'solid' : 'regular'}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                                        <FontAwesome name="share" size={19} color="#ffffff70" />
                                    </TouchableOpacity>
                                </View>

                                <PlayButtonV2
                                    duration={duration}
                                    id={id}
                                    author={author}
                                    imageUri={imageUri}
                                    audioUri={audioUri}
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
        borderWidth: 1,
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
    },
    author: {
        fontSize: 12,
        color: '#ffffffa5',
        flex: 1,
    },
    tag: {
        fontSize: 12,
        color: '#ffffff90',
        textTransform: 'capitalize',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#ffffff25',
    },
    listenCount: {
        fontSize: 12,
        color: '#ffffff70',
    },
    chevron: {
        paddingLeft: 10,
    },

    // Expanded — overflow:hidden on the Animated.View clips the content
    expandedClip: {
        overflow: 'hidden',
    },
    expandedInner: {
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
        paddingTop: 12,
        paddingHorizontal: 12,
        paddingBottom: 0,
        gap: 10,
    },
    expandedImage: {
        width: '100%',
        height: 160,
        borderRadius: 10,
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