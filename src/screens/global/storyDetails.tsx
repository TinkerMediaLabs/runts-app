import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Share, Image } from 'react-native';
import { Text } from '@/components/common/AppText';
import Button from '@/components/common/Button';
import { TextInput } from '@/components/common/AppTextInput';

import { useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsLocked }   from '../../hooks/useIsLocked';
import PaywallModal      from '../../components/common/PaywallModal';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    interpolateColor,
    Extrapolation,
    useAnimatedScrollHandler,
    useAnimatedReaction,
    runOnJS,
    withSpring,
    withTiming,
    Easing,
} from 'react-native-reanimated';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import { formatRelative, parseISO } from 'date-fns';
import TimeConversion from '../../components/functions/TimeConversion';

import CloseButton  from '../../components/common/CloseButton';
import PlayButtonV4 from '../../components/common/PlayButtonV4';
import PlayButtonV3 from '../../components/common/PlayButtonV3';
import PinButton    from '../../components/common/PinButton';
import RatingModal  from '../../features/audio/RatingModal';
import MoreLikeThis from '../../components/story/MoreLikeThis';
import Reveal from '../../components/common/Reveal';

import { spacing } from '../../theme/spacing';
import { useApp }  from '@/context/AppContext';

import { useStory }      from '../../hooks/queries/useStories';
import { useAuthor }     from '../../hooks/queries/useAuthors';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { generateClient } from 'aws-amplify/data';
import type { Schema }   from '../../../amplify/data/resource';

import { Analytics } from '@/lib/analytics';

import { useStoryProgress } from '../../hooks/queries/useStoryProgressMap';
import { useStoryNarratorNames } from '../../hooks/queries/useStoryNarratorNames';
import { fetchAllPages } from '../../lib/paginate';
import { findFinished } from '../../lib/userStoryLookups';
import { useUniverse } from '../../hooks/queries/useUniverse';
import { getDurationDisplay, formatNarratorDisplay, getSpiceDisplay } from '../../lib/storyDisplay';
import { STORY_FORMATS, POV_OPTIONS, TONES, CONTENT_WARNINGS } from '../../constants/storyMetadata';




const client = generateClient<Schema>();

import { Alert } from 'react-native';
import {
  useComments,
  usePostComment,
  useUpdateComment,
  useDeleteComment,
} from '../../hooks/queries/useComments';
import { COMMENT_REJECTED_MESSAGE } from '../../lib/commentFilter';
import { useBlockedUsers, useBlockUser, useReportComment, type ReportReason } from '../../hooks/queries/useModeration';
import { showChip } from '@/lib/chip';

import { CachedImage } from '../../components/common/CachedImage';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width, height } = Dimensions.get('window');
const HERO_HEIGHT            = 340;
const HEADER_THRESHOLD_START = HERO_HEIGHT - 120;
const HEADER_THRESHOLD_END   = HERO_HEIGHT - 60;

const REACTION_EMOJIS: Record<string, string> = {
    shocked:      '😱',
    frustrated:   '😤',
    sad:          '😢',
    reflective:   '🤔',
    touched:      '🥹',
    amused:       '😂',
    scared:       '😨',
    bored:        '😴',
    uninterested: '😑',
    thrilled:     '🤩',
    confused:     '😕',
    tense:        '😰',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

    const StatPill = ({ icon, value, color }: { icon: any; value: string; color?: string }) => (
        <View style={styles.statPill}>
            <FontAwesome5 name={icon} size={iconSize.xs} color={color ?? colors.textSecondary} iconStyle="solid" />
            <Text style={[styles.statText, color ? { color } : null]}>{value}</Text>
        </View>
    );

    const ActionBtn = ({
        onPress, children,
    }: {
        onPress: () => void;
        children: React.ReactNode;
    }) => (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.actionBtn} accessibilityRole="button">
            {children}
        </TouchableOpacity>
    );

    const TagChip = ({
        name,
        onPress,
        isErotic = false,
    }: {
        name:      string;
        onPress:   () => void;
        isErotic?: boolean;
    }) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.tagChip, isErotic && styles.tagChipErotic]}
            accessibilityRole="button"
            accessibilityLabel={`Tag ${name}`}
            accessibilityHint="Opens stories with this tag"
        >
            <Text style={[styles.tagChipText, isErotic && styles.tagChipTextErotic]}>
                #{name}
            </Text>
        </TouchableOpacity>
    );

    const CommentItem = ({
    item,
    currentUserId,
    onEdit,
    onDelete,
    onMore,
    }: {
    item: any;
    currentUserId: string | null;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
    onMore: (item: any) => void;
    }) => {
    const isOwn = item.userId === currentUserId;

    const handleLongPress = () => {
        if (!isOwn) return;
        Alert.alert('Comment', undefined, [
        { text: 'Edit',   onPress: () => onEdit(item) },
        { text: 'Delete', onPress: () => onDelete(item.id), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
        ]);
    };

    return (
        <TouchableOpacity
        onLongPress={handleLongPress}
        activeOpacity={isOwn ? 0.75 : 1}
        delayLongPress={400}
        accessible
        accessibilityLabel={`${item.userName ?? 'Anonymous'} said: ${item.content}`}
        accessibilityActions={isOwn
            ? [{ name: 'edit', label: 'Edit comment' }, { name: 'delete', label: 'Delete comment' }]
            : [{ name: 'more', label: 'Report or block this commenter' }]}
        onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'edit') onEdit(item);
            if (e.nativeEvent.actionName === 'delete') onDelete(item.id);
            if (e.nativeEvent.actionName === 'more') onMore(item);
        }}
        >
        <View style={styles.commentCard}>
            <View style={styles.commentHeader}>
            <View style={styles.commentAvatar}>
                <FontAwesome5 name="user" size={iconSize.sm} color={colors.textTertiary} iconStyle="solid" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.commentUser}>{item.userName ?? 'Anonymous'}</Text>
                {item.createdAt ? (
                <Text style={styles.commentDate}>
                    {formatRelative(parseISO(item.createdAt), new Date())}
                </Text>
                ) : null}
            </View>
            {isOwn ? (
                <Text style={styles.ownBadge}>You</Text>
            ) : (
                <TouchableOpacity
                    onPress={() => onMore(item)}
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    style={{ padding: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Report or block ${item.userName ?? 'this commenter'}`}
                >
                    <FontAwesome5 name="ellipsis-h" size={iconSize.sm} color={colors.textStrong} iconStyle="solid" />
                </TouchableOpacity>
            )}
            </View>
            <Text style={styles.commentContent}>{item.content}</Text>
        </View>
        </TouchableOpacity>
    );
    };

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const StoryScreen = ({ navigation }: any) => {

    const { userId, profile } = useApp();

    const insets     = useSafeAreaInsets();
    const route      = useRoute();
    const { storyID }: any = route.params;

    // ── Real data ─────────────────────────────────────────────────────────────
    const { data: story, isLoading } = useStory(storyID);
    const { data: author } = useAuthor(story?.authorId ?? '');

    const progress = useStoryProgress(story?.id);
    const { data: universe } = useUniverse(story?.universeId);

    // Per-story, index-backed (byStoryId) — never loads the Narrator table.
    const { data: storyNarratorNames = [] } = useStoryNarratorNames(storyID);

    const narratorDisplay = formatNarratorDisplay(storyNarratorNames);
    const durationDisplay = getDurationDisplay(
        story?.duration ?? 0,
        progress?.status ?? 'none',
        progress?.progressSeconds ?? 0
    );

    const { data: resolvedImageUri } = useStoryImage(
        story?.imageUri?.startsWith('stories/') ? story.imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? story?.imageUri ?? '';

    // ── Story tags ────────────────────────────────────────────────────────────
    const [storyTags, setStoryTags] = useState<any[]>([]);

     const primaryTag = storyTags.find((t: any) => t.id === story?.primaryTagId) ?? storyTags[0] ?? null;
     const isLocked   = useIsLocked(story, primaryTag);
    const [showPaywall, setShowPaywall] = useState(false);


    useEffect(() => {
        if (!storyID) return;
        async function fetchTags() {
            try {
                const storyTagLinks = await fetchAllPages<any>(token =>
                    (client.models.StoryTag as any).listStoryTagByStoryId(
                        { storyId: storyID }, { limit: 50, nextToken: token }));

                if (storyTagLinks?.length) {
                    // StoryTag records exist — use them
                    const tagResults = await Promise.all(
                        storyTagLinks.map(st => client.models.Tag.get({ id: st.tagId }))
                    );
                    setStoryTags(tagResults.map(r => r.data).filter(Boolean));
                    return;
                }

                // No StoryTag records — fall back to primaryTagId on the story itself
                if (story?.primaryTagId) {
                    const { data: primaryTag } = await client.models.Tag.get({
                        id: story.primaryTagId,
                    });
                    if (primaryTag) setStoryTags([primaryTag]);
                }
            } catch (e) {
                console.log('Error fetching story tags:', e);
            }
        }
        fetchTags();
    }, [storyID, story?.primaryTagId]); // add story?.primaryTagId so it re-runs when story loads

    // ── User state — finished, rating, reactions ──────────────────────────────
    const [hasFinished,  setHasFinished]  = useState(false);
    const [userRating,   setUserRating]   = useState<any>(null);
    const [topReactions, setTopReactions] = useState<any[]>([]);
    const [showRatingModal, setShowRatingModal] = useState(false);

    useEffect(() => {
        if (!storyID || !userId) return;
        async function fetchUserData() {
            try {
                const [finishedRes, ratingRes, reactionsRes] = await Promise.all([
                    findFinished(userId as string, storyID),
                    (client.models.UserRating as any).listUserRatingByUserIdAndStoryId(
                        { userId, storyId: { eq: storyID } }, { limit: 1 }),
                    // Top reactions: index sorted by count, take the top 4 server-side.
                    (client.models.StoryReactionCount as any).listStoryReactionCountByStoryIdAndCount(
                        { storyId: storyID }, { sortDirection: 'DESC', limit: 4 }),
                ]);

                setHasFinished(!!finishedRes.length);
                setUserRating(ratingRes.data?.[0] ?? null);

                setTopReactions((reactionsRes.data ?? []).filter((r: any) => (r.count ?? 0) > 0));
            } catch (e) {
                console.log('Error fetching user data:', e);
            }
        }
        fetchUserData();
    }, [storyID, userId]);

    // Re-fetch user rating after modal closes so star updates immediately
    const handleRatingModalClose = async () => {
        setShowRatingModal(false);
        try {
            const { data: ratings } = await (client.models.UserRating as any).listUserRatingByUserIdAndStoryId(
                { userId, storyId: { eq: storyID } }, { limit: 1 });
            setUserRating(ratings?.[0] ?? null);

            const { data: reactions } = await (client.models.StoryReactionCount as any).listStoryReactionCountByStoryIdAndCount(
                { storyId: storyID }, { sortDirection: 'DESC', limit: 4 });
            setTopReactions((reactions ?? []).filter((r: any) => (r.count ?? 0) > 0));
        } catch (e) {
            console.log('Error refreshing rating:', e);
        }
    };

    const handleShare = async () => {
        await Share.share({
            message: `Check out "${story?.title}" on Runts: https://tinkermedia.net/runts/story/${story?.id}`,
            url: `https://tinkermedia.net/runts/story/${story?.id}`, // iOS only
            title: story?.title ?? 'Runts',
        });
        Analytics.storyShared({ storyId: story?.id ?? '', title: story?.title ?? '' });
    };

  // ── Comment state ─────────────────────────────────────────────────────────
const [comment,        setComment]        = useState('');
const [seeSpoilers,    setSeeSpoilers]    = useState(false);
const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);
const [postAnonymously, setPostAnonymously] = useState(false);
const focus = useRef<TextInput>(null);

const {
  data: commentPages,
  isLoading: commentsLoading,
  hasNextPage: hasMoreComments,
  fetchNextPage: fetchMoreComments,
  isFetchingNextPage: loadingMoreComments,
} = useComments(storyID);
const comments = React.useMemo(() => commentPages?.pages.flatMap(p => p.items) ?? [], [commentPages]);
const { mutate: postComment,   isPending: posting   } = usePostComment();
const { mutate: updateComment, isPending: updating  } = useUpdateComment();
const { mutate: deleteComment                        } = useDeleteComment();
const { data: blockedList = [] } = useBlockedUsers();
const { mutate: blockUser }      = useBlockUser();
const { mutate: reportComment }  = useReportComment();
const blockedIds = React.useMemo(() => new Set(blockedList.map((b: any) => b.blockedUserId)), [blockedList]);
const visibleComments = React.useMemo(() => comments.filter((c: any) => !blockedIds.has(c.userId)), [comments, blockedIds]);

const submitReport = (item: any, reason: ReportReason) => {
  reportComment({ comment: item, reason }, {
    onSuccess: () => showChip('Thanks. We will review this comment.', 'success'),
    onError:   () => showChip("Couldn't send the report. Please try again.", 'error'),
  });
};

const handleMore = (item: any) => {
  Alert.alert(item.userName ?? 'Commenter', undefined, [
    {
      text: 'Report comment',
      onPress: () => Alert.alert('Why are you reporting this?', undefined, [
        { text: 'Spam',                onPress: () => submitReport(item, 'spam') },
        { text: 'Harassment or hate',   onPress: () => submitReport(item, 'harassment') },
        { text: 'Inappropriate',        onPress: () => submitReport(item, 'inappropriate') },
      ], { cancelable: true }),
    },
    {
      text: `Block ${item.userName ?? 'this person'}`,
      style: 'destructive',
      onPress: () => blockUser(
        { blockedUserId: item.userId, blockedUserName: item.userName },
        { onSuccess: () => showChip('Blocked. You can undo this in Settings.', 'success') },
      ),
    },
    { text: 'Cancel', style: 'cancel' },
  ], { cancelable: true });
};

const handlePost = () => {
  const trimmed = comment.trim();
  if (!trimmed) return;
  postComment(
    {
      storyId: storyID,
      content: trimmed,
      userName: postAnonymously ? 'Anonymous' : (profile?.name ?? 'Anonymous'),
    },
    {
      onSuccess: () => setComment(''),
      onError: (e: any) => showChip(e?.message === COMMENT_REJECTED_MESSAGE ? COMMENT_REJECTED_MESSAGE : "Couldn't post your comment. Please try again.", 'error'),
    }
  );
};

const handleEditSave = () => {
  if (!editingComment) return;
  updateComment(
    { id: editingComment.id, content: editingComment.content, storyId: storyID },
    {
      onSuccess: () => setEditingComment(null),
      onError: (e: any) => showChip(e?.message === COMMENT_REJECTED_MESSAGE ? COMMENT_REJECTED_MESSAGE : "Couldn't save your edit. Please try again.", 'error'),
    }
  );
};

const handleDelete = (id: string) => {
  Alert.alert('Delete comment', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => deleteComment({ id, storyId: storyID }),
    },
  ]);
};

    // ── Scroll animation ──────────────────────────────────────────────────────
    const scrollY = useSharedValue(0);

    const [headerInteractive, setHeaderInteractive] = useState(false);

    useAnimatedReaction(
        () => scrollY.value >= HEADER_THRESHOLD_END,
        (isFullyVisible, wasFullyVisible) => {
            if (isFullyVisible !== wasFullyVisible) {
                runOnJS(setHeaderInteractive)(isFullyVisible);
            }
        }
    );

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => { scrollY.value = e.contentOffset.y; },
    });

    const headerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [HEADER_THRESHOLD_START, HEADER_THRESHOLD_END],
            [0, 1],
            Extrapolation.CLAMP
        ),
        backgroundColor: interpolateColor(
            scrollY.value,
            [HEADER_THRESHOLD_START, HEADER_THRESHOLD_END],
            ['transparent', '#111']
        ),
    }));

    const headerTitleStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [HEADER_THRESHOLD_START, HEADER_THRESHOLD_END],
            [0, 1],
            Extrapolation.CLAMP
        ),
    }));

    const heroImageStyle = useAnimatedStyle(() => ({
        transform: [{
            translateY: interpolate(
                scrollY.value,
                [0, HERO_HEIGHT],
                [0, HERO_HEIGHT * 0.4],
                Extrapolation.CLAMP
            ),
        }],
        opacity: interpolate(
            scrollY.value,
            [0, HERO_HEIGHT * 0.6],
            [1, 0.3],
            Extrapolation.CLAMP
        ),
    }));

    const translateY    = useSharedValue(40);
    const bounceOpacity = useSharedValue(0);

    useEffect(() => {
        translateY.value    = withSpring(0, { damping: 28, stiffness: 180 });
        bounceOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
    }, []);

    const bounceStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: bounceOpacity.value,
    }));

    // ── Loading state ─────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.accent} size="large" />
            </View>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            {/* ── Hero image (parallax) ── */}
            <Animated.View style={[styles.heroImage, heroImageStyle]}>
                <CachedImage source={{ uri: displayImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            </Animated.View>

            {/* Hero gradient */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)', '#111']}
                locations={[0.3, 0.65, 1]}
                style={styles.heroGradient}
                pointerEvents="none"
            />

            {/* ── Sticky header ── */}
                {!showRatingModal && (
                <Animated.View
                    style={[styles.stickyHeader, headerStyle, { paddingTop: insets.top }]}
                    pointerEvents={headerInteractive ? 'auto' : 'none'}
                >
                    <CloseButton navigation={navigation} />
                <Animated.Text style={[styles.stickyTitle, headerTitleStyle]} numberOfLines={1}>
                    {story?.title}
                </Animated.Text>
                {/* Keep space even when locked so layout stays balanced */}
                {!isLocked ? (
                    <PlayButtonV3
                        id={story?.id}
                        title={story?.title}
                        audioUri={story?.audioUri}
                        imageUri={displayImageUri}
                        author={author?.name ?? ''}
                        isPremium={story?.isPremium}
                    />
                ) : (
                    <View style={{ width: 30, height: 30, margin: 12 }} />
                )}
            </Animated.View>
            )}
            {/* ── Scrollable content ── */}
            <Animated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                <View style={{ height: HERO_HEIGHT - 40 }} />

                <Animated.View style={[styles.contentCard, bounceStyle]}>

                    <Reveal index={0}>
                    {/* Title + author */}
                  <View style={styles.titleSection}>
                    <Text style={styles.title}>{story?.title}</Text>

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('AuthorDetails', { id: story?.authorId })}
                        style={styles.authorRow}
                        accessibilityRole="link"
                        accessibilityLabel={`Author ${author?.name ?? ''}`}
                        accessibilityHint="Opens author page"
                    >
                        <FontAwesome5 name="book-open" size={iconSize.xs} color={colors.textSecondary} iconStyle="solid" />
                        <Text style={styles.author}>{author?.name ?? ''}</Text>
                    </TouchableOpacity>

                    {narratorDisplay ? (
                        <View style={[styles.authorRow, { marginTop: 4 }]}>
                            <FontAwesome5 name="microphone" size={iconSize.xs} color={colors.textSecondary} iconStyle="solid" />
                            <Text style={styles.author}>{narratorDisplay}</Text>
                        </View>
                    ) : null}
                </View>

                    </Reveal>

                    <Reveal index={1}>
                    {/* Stats row */}
                    <View style={styles.statsRow}>
                        {story?.licenseType === 'runts_exclusive' && (
                            <View style={styles.ogPill}>
                                <Image source={require('../../../assets/images/icon24w.png')} style={styles.ogIcon} />
                                <Text style={styles.ogPillText}>OG</Text>
                            </View>
                        )}
                        <StatPill icon={durationDisplay.icon} value={durationDisplay.text} color={durationDisplay.color} />
                        {story?.avgRating != null && (
                            <StatPill
                                icon="star"
                                value={`${story.avgRating.toFixed(1)} (${story.numRatings ?? 0})`}
                                color={colors.gold}
                            />
                        )}
                        <StatPill icon="headphones" value={`${story?.numListens ?? 0} listens`} />
                    </View>

                    </Reveal>

                    <Reveal index={2}>
                    {/* Action icons */}
                    <View style={styles.actionsRow}>
                        <View style={styles.actionsLeft}>
                            <PinButton storyId={story?.id ?? ''} size={22} tipTarget="pin-button" />

                            {/* Star — gold outlined if finished+unrated, solid if rated, dim if not finished */}
                            {/* Personal rating badge — hidden if not finished, "Rate" prompt if finished+unrated, rating value if rated */}
                                {hasFinished && (
                                    <TouchableOpacity
                                        onPress={() => setShowRatingModal(true)}
                                        activeOpacity={0.7}
                                        style={styles.personalRatingPill}
                                        accessibilityRole="button"
                                        accessibilityLabel={userRating ? `Your rating ${userRating.rating} out of 10` : 'Rate this story'}
                                        accessibilityHint="Opens the rating form"
                                    >
                                        <MaterialDesignIcons
                                            name={userRating ? 'account-star' : 'account-star-outline'}
                                            size={24}
                                            color={colors.gold}
                                        />
                                        <Text style={styles.personalRatingText}>
                                            {userRating ? userRating.rating : 'Rate'}
                                        </Text>
                                    </TouchableOpacity>
)}

                           <TouchableOpacity onPress={handleShare} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Share story" hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
                                <FontAwesome5 name="share" size={22} color={colors.textPrimary} iconStyle="solid" />
                            </TouchableOpacity>
                        </View>

                       <PlayButtonV4
                            id={story?.id}
                            title={story?.title}
                            audioUri={story?.audioUri}
                            imageUri={displayImageUri}
                            author={author?.name ?? ''}
                            isLocked={isLocked}
                            onLocked={() => setShowPaywall(true)}
                            isPremium={story?.isPremium}
                        />
                    </View>

                    </Reveal>

                                       {/* Story Format / Story Tone / POV */}
                    <View style={styles.separator} />

                    {/* Universe / Sequence Number */}
                                        {/* Universe / Sequence Number */}
                                        
                    {(universe?.name || story?.sequenceNumber || getSpiceDisplay(story?.spiceRating)) ? (
                        <View style={styles.universeRow}>
                            {getSpiceDisplay(story?.spiceRating) ? (
                                <Text style={styles.universeText}>{getSpiceDisplay(story?.spiceRating)}</Text>
                            ) : null}
                            {getSpiceDisplay(story?.spiceRating) && (universe?.name || story?.sequenceNumber) ? (
                                <Text style={styles.universeDot}>·</Text>
                            ) : null}
                            {universe?.name ? (
                                <Text style={styles.universeText}>{universe.name}</Text>
                            ) : null}
                            {universe?.name && story?.sequenceNumber ? (
                                <Text style={styles.universeDot}>·</Text>
                            ) : null}
                            {story?.sequenceNumber ? (
                                <Text style={styles.universeText}>Part {story.sequenceNumber}</Text>
                            ) : null}
                        </View>
                    ) : null}

                    {/* Story Format / Story Tone / POV — pills, same style as numListens */}
                    {(story?.storyFormat || story?.tone || story?.pov) ? (
                        <View style={styles.statsRow}>
                            {story?.storyFormat ? (
                                <StatPill icon="book" value={STORY_FORMATS[story.storyFormat] ?? story.storyFormat} />
                            ) : null}
                            {story?.tone ? (
                                <StatPill icon="theater-masks" value={TONES[story.tone] ?? story.tone} />
                            ) : null}
                            {story?.pov ? (
                                <StatPill icon="eye" value={POV_OPTIONS[story.pov] ?? story.pov} />
                            ) : null}
                        </View>
                    ) : null}

                    <View style={styles.separator} />

                 

                    {/* Summary */}
                    {story?.summary ? (
                        <Text style={styles.summary}>{story.summary}</Text>
                    ) : null}

                     {/* Tags */}
                                        {/* Tags */}
                    {storyTags.length > 0 && (
                        <View style={styles.tagsSection}>
                            <Text style={styles.sectionLabel}>Tags</Text>
                            <View style={styles.tagsWrap}>
                                {storyTags.map((tag: any) => (
                                    <TagChip
                                        key={tag.id}
                                        name={tag.name}
                                        isErotic={tag.isErotic === true}
                                        onPress={() => navigation.navigate('TagHomeScreen', {
                                            id:   tag.id,
                                            name: tag.name,
                                        })}
                                    />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Description */}
                    {story?.description ? (
                        <Text style={styles.description}>{story.description}</Text>
                    ) : null}

                    {/* Credit */}
                    {story?.credit ? (
                        <Text style={[styles.description, { marginTop: 12, fontStyle: 'italic' }]}>
                            {story.credit}
                        </Text>
                    ) : null}

                     <View style={[styles.separator, { marginTop: 20, marginBottom: 0 }]} />

                    {/* Content Warnings */}
                    {(story?.contentWarnings?.length ?? 0) > 0 && (
                        <View style={styles.tagsSection}>
                            <Text style={styles.sectionLabel}>Content Warnings</Text>
                            <View style={styles.tagsWrap}>
                                {(story?.contentWarnings ?? []).filter(Boolean).map((warning: any) => (                                  
                                    <View key={warning} style={styles.warningChip}>
                                        <Text style={styles.warningChipText}>
                                            {CONTENT_WARNINGS[warning] ?? warning}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── Reaction aggregate ── */}
                    {topReactions.length > 0 && (
                        <View style={styles.reactionsSection}>
                            <Text style={styles.sectionLabel}>Reactions</Text>
                            <View style={styles.reactionsRow}>
                                {topReactions.map(r => (
                                    <View key={r.reactionType} style={styles.reactionPill}>
                                        <Text style={styles.reactionEmoji}>
                                            {REACTION_EMOJIS[r.reactionType] ?? '❓'}
                                        </Text>
                                        <Text style={styles.reactionCount}>{r.count}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    <MoreLikeThis story={story} />

                    <View style={styles.separator} />
{/* ── Discussion ── */}
<Text style={styles.sectionLabel}>
  Discussion{story?.numComments ? ` · ${story.numComments}` : ''}
</Text>

{/* Edit mode — shown when editing an existing comment */}
{editingComment ? (
  <View style={styles.commentInput}>
    <TextInput
        accessibilityLabel="Edit comment"
        accessibilityHint="Edit the text of your comment"
      style={styles.commentInputText}
      value={editingComment.content}
      onChangeText={text => setEditingComment(prev => prev ? { ...prev, content: text } : null)}
      multiline
      maxLength={500}
      autoFocus
    />
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
      <Button label="Cancel" size="small" variant="secondary" onPress={() => setEditingComment(null)} accessibilityLabel="Cancel editing comment" />
      <Button label="Save" size="small" loading={updating} onPress={handleEditSave} accessibilityLabel="Save comment" />
    </View>
  </View>
) : (
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.commentInput}>
      <TextInput
        ref={focus}
        placeholder="Leave a comment…"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Leave a comment"
        style={styles.commentInputText}
        maxLength={500}
        multiline
        numberOfLines={2}
        onChangeText={setComment}
        value={comment}
      />
      {/* Anonymous toggle */}
        <TouchableOpacity
            onPress={() => setPostAnonymously(v => !v)}
            activeOpacity={0.7}
            style={styles.anonRow}
            accessibilityRole="checkbox"
            accessibilityLabel="Post anonymously"
            accessibilityState={{ checked: postAnonymously }}
            >
            <View style={[styles.anonCheckbox, postAnonymously && styles.anonCheckboxActive]}>
                {postAnonymously && (
                <FontAwesome5 name="check" size={9} color={colors.textOnAccent} iconStyle="solid" />
                )}
            </View>
            <Text style={styles.anonLabel}>Post anonymously</Text>
        </TouchableOpacity>
      {comment.length > 0 && (
        <Button
          label="Post"
          size="small"
          loading={posting}
          onPress={handlePost}
          accessibilityLabel="Post comment"
          style={{ alignSelf: 'flex-end', marginTop: 10 }}
        />
      )}
    </View>
  </KeyboardAvoidingView>
)}

{/* Spoiler gate + comment list */}
{seeSpoilers ? (
  commentsLoading ? (
    <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
  ) : (
    <FlatList
      data={visibleComments}
      renderItem={({ item }) => (
        <CommentItem
          item={item}
          currentUserId={userId}
          onEdit={setEditingComment}
          onDelete={handleDelete}
          onMore={handleMore}
        />
      )}
      keyExtractor={item => item.id}
      scrollEnabled={false}
      ListEmptyComponent={
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
          No comments yet. Be the first!
        </Text>
      }
      ListFooterComponent={
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          {hasMoreComments ? (
            loadingMoreComments ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <TouchableOpacity onPress={() => fetchMoreComments()} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Load more comments">
                <Text style={{ color: colors.accent, fontSize: fontSizes.small }}>Load more comments</Text>
              </TouchableOpacity>
            )
          ) : null}
          <View style={{ height: 40 }} />
        </View>
      }
    />
  )
) : (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => setSeeSpoilers(true)}
    style={styles.spoilerGate}
    accessibilityRole="button"
    accessibilityLabel="Spoiler warning. Show comments"
    accessibilityHint="Comments may reveal the story"
  >
    <FontAwesome5 name="exclamation-triangle" size={iconSize.sm} color="#ff8888" iconStyle="solid" />
    <Text style={styles.spoilerTitle}>Spoiler Warning</Text>
    <Text style={styles.spoilerSub}>Tap to view comments</Text>
  </TouchableOpacity>
)}

                </Animated.View>
            </Animated.ScrollView>

            {/* Back button */}
            {!showRatingModal && (
                <View style={[styles.backButtonAbsolute, { top: insets.top + 10 }]}>
                    <CloseButton navigation={navigation} />
                </View>
            )}

            {/* Rating modal — re-rate from story detail */}
            <RatingModal
                visible={showRatingModal}
                storyId={storyID}
                storyTitle={story?.title ?? ''}
                artwork={displayImageUri}
                onClose={handleRatingModalClose}
            />

            <PaywallModal
                visible={showPaywall}
                onClose={() => setShowPaywall(false)}
                storyTitle={story?.title}
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
        backgroundColor: colors.surface1,
    },

    heroImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height: HERO_HEIGHT,
    },
    heroGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height: HERO_HEIGHT,
    },

    stickyHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.margin,
        paddingBottom: 12,
        gap: 10,
    },
    stickyTitle: {
        flex: 1,
        fontSize: fontSizes.body,
        fontWeight: '700',
        color: colors.textPrimary,
    },

    backButtonAbsolute: {
        position: 'absolute',
        left: spacing.margin,
        zIndex: 20,
    },

    contentCard: {
        backgroundColor: colors.surface1,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: spacing.margin,
        paddingTop: 24,
        minHeight: height * 0.7,
    },

    titleSection: {
        marginBottom: 12,
        gap: 8,
    },
    title: {
        fontSize: fontSizes.headline,
        fontWeight: '800',
        color: colors.textPrimary,
        lineHeight: 30,
        letterSpacing: 0.2,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    author: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
        textTransform: 'capitalize',
    },

    statsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface2,
        borderRadius: radius.xl,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statText: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
    },

    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    actionsLeft: {
        flexDirection: 'row',
        gap: 24,
        alignItems: 'center',
    },
    actionBtn: {
        padding: 4,
    },

    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.surface3,
        marginBottom: 20

    },

    summary: {
        fontSize: fontSizes.body,
        color: colors.textStrong,
        lineHeight: 24,
        marginBottom: 12,
    },
    description: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
        lineHeight: 22,
    },

    tagsSection: {
        marginTop: 20,
        marginBottom: 30
    },
    tagsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    tagChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: radius.xl,
        backgroundColor: '#1A4851a5',
        borderWidth: 0.5,
        borderColor: colors.accentSoft,
    },
    tagChipText: {
        color: colors.accent,
        fontSize: fontSizes.small,
        textTransform: 'lowercase',
    },

    // ── Reactions ─────────────────────────────────────────────────────────────
    reactionsSection: {
        marginTop: 20,
        marginBottom: 20
    },
    reactionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
        flexWrap: 'wrap',
    },
    reactionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface2,
        borderRadius: radius.xl,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: colors.border,
    },
    reactionEmoji: {
        fontSize: fontSizes.subtitle,
    },
    reactionCount: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
        fontWeight: '600',
    },

    sectionLabel: {
        fontSize: fontSizes.small,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
    },

    commentInput: {
        backgroundColor: colors.surface2,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        marginBottom: 16,
    },
    commentInputText: {
        color: colors.textPrimary,
        fontSize: fontSizes.small,
        minHeight: 40,
    },
    spoilerGate: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,100,100,0.3)',
        backgroundColor: 'rgba(255,100,100,0.06)',
        gap: 6,
        marginBottom: 20,
    },
    spoilerTitle: {
        color: '#ff8888',
        fontSize: fontSizes.body,
        fontWeight: '700',
    },
    spoilerSub: {
        color: colors.textSecondary,
        fontSize: fontSizes.small,
    },

    commentCard: {
        backgroundColor: colors.surface2,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        marginBottom: 10,
        gap: 8,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surface3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentUser: {
        fontSize: fontSizes.small,
        fontWeight: '700',
        color: colors.textPrimary,
        textTransform: 'capitalize',
    },
    commentDate: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
    },
    commentRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 'auto',
        backgroundColor: colors.surface3,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.md,
    },
    commentRatingText: {
        fontSize: fontSizes.caption,
        color: colors.gold,
        fontWeight: '600',
    },
    commentContent: {
        fontSize: fontSizes.small,
        color: colors.textStrong,
        lineHeight: 20,
    },
    ownBadge: {
        fontSize: fontSizes.caption,
        color: colors.accent,
        fontWeight: '600',
        backgroundColor: 'rgba(0,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.md,
        borderWidth: 0.5,
        borderColor: 'rgba(0,255,255,0.3)',
    },
        anonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
        anonCheckbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
        anonCheckboxActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
        anonLabel: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
    },
    tagChipErotic: {
        backgroundColor: 'rgba(255,124,42,0.12)',
        borderColor:     'rgba(255,124,42,0.5)',
    },
    tagChipTextErotic: {
        color: '#ff7c2a',
    },
    metaLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
},
metaLineText: {
    fontSize: fontSizes.small,
    color: colors.textSecondary,
},
metaLineDot: {
    color: colors.textSecondary,
    fontSize: fontSizes.small,
},
universeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
},
universeText: {
    fontSize: fontSizes.small,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
},
universeDot: {
    color: 'rgba(0,255,255,0.4)',
    fontSize: fontSizes.small,
},
warningChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,68,68,0.4)',
},
warningChipText: {
    color: '#ff8888',
    fontSize: fontSizes.small,
},
personalRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
},
personalRatingText: {
    fontSize: fontSizes.small,
    fontWeight: '700',
    color: colors.gold,
},
ogPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,255,255,0.1)',
    borderRadius: radius.xl,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
},
ogIcon: {
    width: 14,
    height: 14,
},
ogPillText: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: colors.accent,
},
});

export default StoryScreen;