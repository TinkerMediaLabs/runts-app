import React, { useState, useMemo } from 'react';
import { SkeletonAuthorPage } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { View, TouchableOpacity, FlatList, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Text } from '@/components/common/AppText';

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

import StoryTile   from '../../components/story/StoryTile';
import SocialBlock from '../../components/story/SocialBlock';

import { useAuthor } from '../../hooks/queries/useAuthors';
import { useStoriesByAuthorPaginated } from '../../hooks/queries/useStories';
import { useTagNames } from '../../hooks/queries/useTagNames';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useAuthorImage } from '../../hooks/queries/useAuthorImage';

import {
  useIsFollowing,
  useFollowAuthor,
  useUnfollowAuthor,
} from '../../hooks/queries/useAuthorFollowing';

import { useApp } from '@/context/AppContext';

import { CachedImage } from '../../components/common/CachedImage';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';
const { width } = Dimensions.get('window');
const AVATAR_SIZE   = 100;
const HEADER_H      = 260;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// ---------------------------------------------------------------------------
// Stat pill
// ---------------------------------------------------------------------------

const StatPill = ({ icon, label }: { icon: any; label: string }) => (
    <View style={styles.statPill}>
        <FontAwesome5 name={icon} size={iconSize.xs} color={colors.textSecondary} iconStyle="solid" />
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
            secondaryTag={tagMap[item.secondaryTagId ?? ''] ?? ''}
            audioUri={item.audioUri}
            summary={item.summary}
            description={item.description}
            author={authorName}
            duration={item.duration}
            id={item.id}
            numListens={item.numListens}
            licenseType={item.licenseType}
            universeId={item.universeId}
            sequenceNumber={item.sequenceNumber}
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
    const { data: authorImageUrl } = useAuthorImage(author?.profilePicUri);
    const {
        data: storyPages,
        isLoading: storiesLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useStoriesByAuthorPaginated(id, 30);
    const allStories = useMemo(() => storyPages?.pages.flatMap(p => p.items) ?? [], [storyPages]);

    // Filter stories by this author
    const authorStories = useMemo(() => {
        if (!allStories) return [];
        return allStories.filter(s =>
            s.authorId === id &&
            s.live === 'true' &&
            (eroticEnabled || s.isErotic !== 'true')
        );
    }, [allStories, id, eroticEnabled]);

    const { data: tagMap = {} } = useTagNames(
        authorStories.flatMap((s: any) => [s.primaryTagId, s.secondaryTagId])
    );

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
            [0, HEADER_H * 2.0],
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
            <View style={styles.root}>
                <SkeletonAuthorPage />
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
                <TouchableOpacity hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} onPress={() => navigation.goBack()} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
                    <FontAwesome5 name="times" size={iconSize.md} color={colors.textPrimary} iconStyle="solid" />
                </TouchableOpacity>

                <Animated.Text numberOfLines={1} style={[styles.topBarTitle, titleStyle]}>
                    {author?.name ?? ''}
                </Animated.Text>

               <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleToggleFollow}
                    // disabled={following || unfollowing || followLoading}
                    style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                    accessibilityRole="button"
                    accessibilityLabel={isFollowing ? `Following ${author?.name ?? 'author'}` : `Follow ${author?.name ?? 'author'}`}
                    accessibilityHint={isFollowing ? 'Double tap to unfollow' : undefined}
                    accessibilityState={{ selected: !!isFollowing }}
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
                onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
                onEndReachedThreshold={0.5}
                keyExtractor={(item: any) => item.id}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                ListEmptyComponent={
                    <EmptyState
                        icon={<FontAwesome5 name="book-open" size={40} color={colors.textSecondary} iconStyle="solid" />}
                        title="No stories yet"
                        body="Check back soon for new stories from this author."
                    />
                }

                ListHeaderComponent={
                    <Animated.View style={[styles.header, headerStyle, { paddingTop: insets.top + 60 }]}>

                       <LinearGradient
                            colors={['#000', '#000', '#000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />

                        {/* Avatar */}
                        {/* Avatar — hidden entirely if the author has no image */}
                        {authorImageUrl ? (
                            <View style={styles.avatarWrapper}>
                                <CachedImage source={{ uri: authorImageUrl }} style={styles.avatar} />
                                <View style={styles.avatarRing} />
                            </View>
                        ) : null}

                        {/* Name */}
                        <Text style={styles.name}>{author?.name ?? ''}</Text>

                        {/* Stats */}
                        <View style={styles.statsRow}>
                            <StatPill icon="book-open" label={`${authorStories.length}${hasNextPage ? '+' : ''} ${authorStories.length === 1 ? 'Story' : 'Stories'}`} />
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
        backgroundColor: colors.surface0,
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
        borderBottomColor: colors.border,
    },
    closeBtn: {
        padding: 4,
        marginRight: 12,
    },
    topBarTitle: {
        flex: 1,
        fontSize: fontSizes.subtitle,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    followBtn: {
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: radius.xl,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    followBtnActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    followBtnText: {
        color: colors.accent,
        fontWeight: '700',
        fontSize: fontSizes.small,
    },
    followBtnTextActive: {
        color: colors.textOnAccent,
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
        backgroundColor: colors.surface3,
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
        fontSize: fontSizes.headline,
        fontWeight: '800',
        color: colors.textPrimary,
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
        backgroundColor: colors.surface2,
        borderRadius: radius.xl,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statText: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
    },

    followBtnLarge: {
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: radius.xl,
        paddingHorizontal: 36,
        paddingVertical: 10,
        marginBottom: 24,
    },
    followBtnLargeActive: {
        backgroundColor: 'rgba(0,255,255,0.12)',
    },
    followBtnLargeText: {
        color: colors.accent,
        fontWeight: '700',
        fontSize: fontSizes.body,
    },
    followBtnLargeTextActive: {
        color: colors.accent,
    },

    bio: {
        color: colors.textSecondary,
        fontSize: fontSizes.small,
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
        fontSize: fontSizes.small,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    storiesLabelLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.surface3,
    },
});

export default CreatorProfile;