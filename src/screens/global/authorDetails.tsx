import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    FlatList,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
} from 'react-native';

import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    interpolate,
    interpolateColor,
    Extrapolation,
} from 'react-native-reanimated';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import AntDesign    from '@react-native-vector-icons/ant-design';

import StoryTile   from '../../components/story/StoryTile';
import SocialBlock from '../../components/story/SocialBlock';

import { useAuthor } from '../../hooks/queries/useAuthors';
import { useStories } from '../../hooks/queries/useStories';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useTags } from '../../hooks/queries/useTags';

import {
  useIsFollowing,
  useFollowAuthor,
  useUnfollowAuthor,
} from '../../hooks/queries/useAuthorFollowing';

import { useApp } from '@/context/AppContext';

const { width } = Dimensions.get('window');
const AVATAR_SIZE   = 100;
const HEADER_H      = 260;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// ---------------------------------------------------------------------------
// Stat pill
// ---------------------------------------------------------------------------

const StatPill = ({ icon, label }: { icon: any; label: string }) => (
    <View style={styles.statPill}>
        <FontAwesome5 name={icon} size={12} color="rgba(255,255,255,0.6)" iconStyle="solid" />
        <Text style={styles.statText}>{label}</Text>
    </View>
);

// ---------------------------------------------------------------------------
// Story tile wrapper — resolves S3 image per tile
// ---------------------------------------------------------------------------

const AuthorStoryTile = ({ item, tagMap, authorName }: { item: any; tagMap: Record<string, string>; authorName: string }) => {
    const { data: resolvedImageUri } = useStoryImage(
        item?.imageUri?.startsWith('stories/') ? item.imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? item?.imageUri ?? '';

    return (
        <StoryTile
            title={item.title}
            imageUri={displayImageUri}
            primaryTag={tagMap[item.primaryTagId] ?? ''}
            audioUri={item.audioUri}
            summary={item.summary}
            description={item.description}
            author={authorName}
            duration={item.duration}
            id={item.id}
            numListens={item.numListens}
        />
    );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const CreatorProfile = () => {

    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const route = useRoute();
    const { id }: any = route.params;

    const { eroticEnabled } = useApp();

    const { data: followData, isLoading: followLoading } = useIsFollowing(id);
    const isFollowing = followData?.isFollowing ?? false;
    const followRecordId = followData?.recordId ?? null;

    const { mutate: followAuthor,   isPending: following   } = useFollowAuthor();
    const { mutate: unfollowAuthor, isPending: unfollowing } = useUnfollowAuthor();

    const handleToggleFollow = () => {
    if (isFollowing && followRecordId) {
        unfollowAuthor({ recordId: followRecordId, authorId: id });
    } else {
        followAuthor(id);
    }
    };

    // ── Real data ─────────────────────────────────────────────────────────────
    const { data: author, isLoading: authorLoading } = useAuthor(id);
    const { data: allStories, isLoading: storiesLoading } = useStories();
    const { data: tags } = useTags();

    // Filter stories by this author
    const authorStories = useMemo(() => {
        if (!allStories) return [];
        return allStories.filter(s =>
            s.authorId === id &&
            s.live &&
            (eroticEnabled || s.isErotic !== 'true')
        );
    }, [allStories, id, eroticEnabled]);

    // Build tag lookup map
    const tagMap = useMemo(() => {
        if (!tags) return {};
        return tags.reduce((acc: Record<string, string>, tag) => {
            if (tag.id && tag.name) acc[tag.id] = tag.name;
            return acc;
        }, {});
    }, [tags]);

    const isLoading = authorLoading || storiesLoading;

    // ── Scroll animation ──────────────────────────────────────────────────────
    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => { scrollY.value = e.contentOffset.y; },
    });

    const topBarStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            scrollY.value,
            [HEADER_H - 80, HEADER_H],
            ['transparent', '#111']
        ),
        borderBottomWidth: interpolate(
            scrollY.value,
            [HEADER_H - 20, HEADER_H],
            [0, StyleSheet.hairlineWidth],
            Extrapolation.CLAMP
        ),
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [HEADER_H - 60, HEADER_H],
            [0, 1],
            Extrapolation.CLAMP
        ),
    }));

    const headerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [0, HEADER_H * 0.6],
            [1, 0],
            Extrapolation.CLAMP
        ),
        transform: [{
            translateY: interpolate(
                scrollY.value,
                [0, HEADER_H],
                [0, -HEADER_H * 0.3],
                Extrapolation.CLAMP
            ),
        }],
    }));

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color="cyan" size="large" />
            </View>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    const renderItem = ({ item }: any) => (
        <AuthorStoryTile item={item} tagMap={tagMap} authorName={author?.name ?? ''} />
    );

    return (
        <View style={styles.root}>

            {/* ── Sticky top bar ── */}
            <Animated.View style={[
                styles.topBar,
                { paddingTop: insets.top + 10 },
                topBarStyle,
            ]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <AntDesign name="close" size={22} color="#fff" />
                </TouchableOpacity>

                <Animated.Text numberOfLines={1} style={[styles.topBarTitle, titleStyle]}>
                    {author?.name ?? ''}
                </Animated.Text>

               <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleToggleFollow}
                    disabled={following || unfollowing || followLoading}
                    style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                    >
                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            </Animated.View>

            {/* ── Main list ── */}
            <AnimatedFlatList
                data={authorStories}
                renderItem={renderItem}
                keyExtractor={(item: any) => item.id}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingTop: 40 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                            No stories yet
                        </Text>
                    </View>
                }

                ListHeaderComponent={
                    <Animated.View style={[styles.header, headerStyle, { paddingTop: insets.top + 60 }]}>

                        <LinearGradient
                            colors={['#1a1a2e', '#12121a', '#111']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />

                        {/* Avatar */}
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={
                                    author?.profilePicUri
                                        ? { uri: author.profilePicUri }
                                        : require('../../../assets/images/blankprofile.png')
                                }
                                style={styles.avatar}
                            />
                            <View style={styles.avatarRing} />
                        </View>

                        {/* Name */}
                        <Text style={styles.name}>{author?.name ?? ''}</Text>

                        {/* Stats */}
                        <View style={styles.statsRow}>
                            <StatPill icon="book-open" label={`${authorStories.length} ${authorStories.length === 1 ? 'Story' : 'Stories'}`} />
                            <StatPill icon="headphones" label={`${authorStories.reduce((sum, s) => sum + (s.numListens ?? 0), 0)} Listens`} />
                        </View>

                        {/* Follow button */}
                        {/* <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleToggleFollow}
                            disabled={following || unfollowing || followLoading}
                            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                            >
                            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity> */}

                        {/* Bio */}
                        {author?.bio ? (
                            <Text style={styles.bio}>{author.bio}</Text>
                        ) : null}

                        {/* Stories label */}
                        <View style={styles.storiesLabel}>
                            <Text style={styles.storiesLabelText}>Stories</Text>
                            <View style={styles.storiesLabelLine} />
                        </View>

                    </Animated.View>
                }

                ListFooterComponent={<View style={{ height: 80 }} />}
            />

        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    root: {
        flex: 1,
        backgroundColor: '#111',
    },

    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 12,
        paddingHorizontal: 20,
        borderBottomColor: '#2a2a2a',
    },
    closeBtn: {
        padding: 4,
        marginRight: 12,
    },
    topBarTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    followBtn: {
        borderWidth: 1,
        borderColor: 'cyan',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    followBtnActive: {
        backgroundColor: 'cyan',
        borderColor: 'cyan',
    },
    followBtnText: {
        color: 'cyan',
        fontWeight: '700',
        fontSize: 13,
    },
    followBtnTextActive: {
        color: '#000',
    },

    header: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 32,
        overflow: 'hidden',
    },

    avatarWrapper: {
        position: 'relative',
        marginBottom: 16,
        marginTop: 16,
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: '#2a2a2a',
    },
    avatarRing: {
        position: 'absolute',
        top: -3,
        left: -3,
        width: AVATAR_SIZE + 6,
        height: AVATAR_SIZE + 6,
        borderRadius: (AVATAR_SIZE + 6) / 2,
        borderWidth: 1.5,
        borderColor: 'rgba(0,255,255,0.3)',
    },

    name: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 12,
        letterSpacing: 0.2,
    },

    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1e1e1e',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    statText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
    },

    followBtnLarge: {
        borderWidth: 1,
        borderColor: 'cyan',
        borderRadius: 24,
        paddingHorizontal: 36,
        paddingVertical: 10,
        marginBottom: 24,
    },
    followBtnLargeActive: {
        backgroundColor: 'rgba(0,255,255,0.12)',
    },
    followBtnLargeText: {
        color: 'cyan',
        fontWeight: '700',
        fontSize: 15,
    },
    followBtnLargeTextActive: {
        color: 'cyan',
    },

    bio: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },

    storiesLabel: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
    },
    storiesLabelText: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    storiesLabelLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#2a2a2a',
    },
});

export default CreatorProfile;