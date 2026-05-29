import React, { useState, useEffect, useRef } from 'react';
import {
    Text,
    View,
    StyleSheet,
    Dimensions,
    ScrollView,
    TouchableOpacity,
    FlatList,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';

import { useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    interpolateColor,
    Extrapolation,
    useAnimatedScrollHandler,
    withSpring,
    withTiming,
    Easing,
} from 'react-native-reanimated';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import FontAwesome  from '@react-native-vector-icons/fontawesome';

import { formatRelative, parseISO } from 'date-fns';
import TimeConversion from '../../components/functions/TimeConversion';

import CloseButton  from '../../components/common/CloseButton';
import PlayButtonV4 from '../../components/common/PlayButtonV4';
import PlayButtonV3 from '../../components/common/PlayButtonV3';
import PinButton    from '../../components/common/PinButton';
import RatingModal  from '../../features/audio/RatingModal';

import { spacing } from '../../theme/spacing';
import { useApp }  from '@/context/AppContext';

import { useStory }      from '../../hooks/queries/useStories';
import { useAuthor }     from '../../hooks/queries/useAuthors';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { generateClient } from 'aws-amplify/data';
import type { Schema }   from '../../../amplify/data/resource';

const client = generateClient<Schema>();

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
        <FontAwesome5 name={icon} size={12} color={color ?? 'rgba(255,255,255,0.6)'} iconStyle="solid" />
        <Text style={[styles.statText, color ? { color } : null]}>{value}</Text>
    </View>
);

const ActionBtn = ({
    onPress, children,
}: {
    onPress: () => void;
    children: React.ReactNode;
}) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.actionBtn}>
        {children}
    </TouchableOpacity>
);

const TagChip = ({ name, onPress }: { name: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.tagChip}>
        <Text style={styles.tagChipText}>#{name}</Text>
    </TouchableOpacity>
);

const CommentItem = ({ content, createdAt, userName, rating }: any) => (
    <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
            <View style={styles.commentAvatar}>
                <FontAwesome5 name="user" size={14} color="rgba(255,255,255,0.4)" iconStyle="solid" />
            </View>
            <View>
                <Text style={styles.commentUser}>{userName}</Text>
                {createdAt ? (
                    <Text style={styles.commentDate}>
                        {formatRelative(parseISO(createdAt), new Date())}
                    </Text>
                ) : null}
            </View>
            {rating ? (
                <View style={styles.commentRating}>
                    <FontAwesome name="star" size={11} color="#C9A84C" />
                    <Text style={styles.commentRatingText}>{rating}</Text>
                </View>
            ) : null}
        </View>
        <Text style={styles.commentContent}>{content}</Text>
    </View>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const StoryScreen = ({ navigation }: any) => {

    const { userId } = useApp();
    const insets     = useSafeAreaInsets();
    const route      = useRoute();
    const { storyID }: any = route.params;

    // ── Real data ─────────────────────────────────────────────────────────────
    const { data: story, isLoading } = useStory(storyID);
    const { data: author } = useAuthor(story?.authorId ?? '');
    const { data: resolvedImageUri } = useStoryImage(
        story?.imageUri?.startsWith('stories/') ? story.imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? story?.imageUri ?? '';

    // ── Story tags ────────────────────────────────────────────────────────────
    const [storyTags, setStoryTags] = useState<any[]>([]);

    useEffect(() => {
        if (!storyID) return;
        async function fetchTags() {
            try {
                const { data: storyTagLinks } = await client.models.StoryTag.list({
                    filter: { storyId: { eq: storyID } },
                });
                if (!storyTagLinks?.length) return;
                const tagResults = await Promise.all(
                    storyTagLinks.map(st => client.models.Tag.get({ id: st.tagId }))
                );
                setStoryTags(tagResults.map(r => r.data).filter(Boolean));
            } catch (e) {
                console.log('Error fetching story tags:', e);
            }
        }
        fetchTags();
    }, [storyID]);

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
                    client.models.UserFinishedStory.list({
                        filter: { and: [{ userId: { eq: userId } }, { storyId: { eq: storyID } }] },
                    }),
                    client.models.UserRating.list({
                        filter: { and: [{ userId: { eq: userId } }, { storyId: { eq: storyID } }] },
                    }),
                    client.models.StoryReactionCount.list({
                        filter: { storyId: { eq: storyID } },
                    }),
                ]);

                setHasFinished(!!finishedRes.data?.length);
                setUserRating(ratingRes.data?.[0] ?? null);

                const sorted = (reactionsRes.data ?? [])
                    .filter(r => (r.count ?? 0) > 0)
                    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                    .slice(0, 4);
                setTopReactions(sorted);
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
            const { data: ratings } = await client.models.UserRating.list({
                filter: { and: [{ userId: { eq: userId } }, { storyId: { eq: storyID } }] },
            });
            setUserRating(ratings?.[0] ?? null);

            const { data: reactions } = await client.models.StoryReactionCount.list({
                filter: { storyId: { eq: storyID } },
            });
            const sorted = (reactions ?? [])
                .filter(r => (r.count ?? 0) > 0)
                .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                .slice(0, 4);
            setTopReactions(sorted);
        } catch (e) {
            console.log('Error refreshing rating:', e);
        }
    };

    // Star appearance:
    // - Not finished → dim outlined star (not tappable)
    // - Finished, no rating → gold outlined star
    // - Finished + rated → gold solid star
    const starIcon  = userRating ? 'star' : 'star';
    const starStyle = userRating ? 'solid' : 'regular';
    const starColor = hasFinished
        ? '#C9A84C'
        : 'rgba(255,255,255,0.3)';

    // ── Comment state ─────────────────────────────────────────────────────────
    const [comment,     setComment]     = useState('');
    const [commentList, setCommentList] = useState<any[]>([]);
    const [seeSpoilers, setSeeSpoilers] = useState(false);
    const focus = useRef<TextInput>(null);

    // ── Scroll animation ──────────────────────────────────────────────────────
    const scrollY = useSharedValue(0);

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
                <ActivityIndicator color="cyan" size="large" />
            </View>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            {/* ── Hero image (parallax) ── */}
            <Animated.Image
                source={{ uri: displayImageUri }}
                style={[styles.heroImage, heroImageStyle]}
                resizeMode="cover"
            />

            {/* Hero gradient */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)', '#111']}
                locations={[0.3, 0.65, 1]}
                style={styles.heroGradient}
                pointerEvents="none"
            />

            {/* ── Sticky header ── */}
            <Animated.View style={[styles.stickyHeader, headerStyle, { paddingTop: insets.top }]}>
                <CloseButton navigation={navigation} />
                <Animated.Text style={[styles.stickyTitle, headerTitleStyle]} numberOfLines={1}>
                    {story?.title}
                </Animated.Text>
                <PlayButtonV3
                    id={story?.id}
                    title={story?.title}
                    audioUri={story?.audioUri}
                    imageUri={displayImageUri}
                    author={author?.name ?? ''}
                />
            </Animated.View>

            {/* ── Scrollable content ── */}
            <Animated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                <View style={{ height: HERO_HEIGHT - 40 }} />

                <Animated.View style={[styles.contentCard, bounceStyle]}>

                    {/* Title + author */}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>{story?.title}</Text>

                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('AuthorDetails', { id: story?.authorId })}
                            style={styles.authorRow}
                        >
                            <FontAwesome5 name="book-open" size={12} color="rgba(255,255,255,0.6)" iconStyle="solid" />
                            <Text style={styles.author}>{author?.name ?? ''}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Stats row */}
                    <View style={styles.statsRow}>
                        <StatPill icon="headphones" value={`${story?.numListens ?? 0} listens`} />
                        <StatPill icon="clock"      value={TimeConversion(story?.duration)} />
                        {story?.avgRating != null && (
                            <StatPill
                                icon="star"
                                value={`${story.avgRating.toFixed(1)} (${story.numRatings ?? 0})`}
                                color="#C9A84C"
                            />
                        )}
                    </View>

                    {/* Action icons */}
                    <View style={styles.actionsRow}>
                        <View style={styles.actionsLeft}>
                            <PinButton storyId={story?.id ?? ''} size={22} />

                            {/* Star — gold outlined if finished+unrated, solid if rated, dim if not finished */}
                            <ActionBtn onPress={() => {
                                if (hasFinished) setShowRatingModal(true);
                            }}>
                                <FontAwesome
                                    name={starStyle === 'solid' ? 'star' : 'star-o'}
                                    size={21}
                                    color={starColor}
                                />
                            </ActionBtn>

                            <ActionBtn onPress={() => {}}>
                                <FontAwesome name="share" size={21} color="rgba(255,255,255,0.75)" />
                            </ActionBtn>
                        </View>

                        <PlayButtonV4
                            id={story?.id}
                            title={story?.title}
                            audioUri={story?.audioUri}
                            imageUri={displayImageUri}
                            author={author?.name ?? ''}
                        />
                    </View>

                    <View style={styles.separator} />

                    {/* Summary */}
                    {story?.summary ? (
                        <Text style={styles.summary}>{story.summary}</Text>
                    ) : null}

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

                    {/* Tags */}
                    {storyTags.length > 0 && (
                        <View style={styles.tagsSection}>
                            <Text style={styles.sectionLabel}>Tags</Text>
                            <View style={styles.tagsWrap}>
                                {storyTags.map((tag: any) => (
                                    <TagChip
                                        key={tag.id}
                                        name={tag.name}
                                        onPress={() => navigation.navigate('TagHomeScreen', {
                                            id: tag.id,
                                            name: tag.name,
                                        })}
                                    />
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

                    <View style={styles.separator} />

                    {/* ── Discussion ── */}
                    <Text style={styles.sectionLabel}>
                        Discussion{story?.numComments ? ` · ${story.numComments}` : ''}
                    </Text>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <View style={styles.commentInput}>
                            <TextInput
                                ref={focus}
                                placeholder="Leave a comment…"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                style={styles.commentInputText}
                                maxLength={500}
                                multiline
                                numberOfLines={2}
                                onChangeText={setComment}
                                value={comment}
                            />
                            {comment.length > 0 && (
                                <TouchableOpacity style={styles.postBtn} activeOpacity={0.8}>
                                    <Text style={styles.postBtnText}>Post</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </KeyboardAvoidingView>

                    {seeSpoilers ? (
                        <FlatList
                            data={commentList}
                            renderItem={({ item }) => (
                                <CommentItem
                                    content={item.content}
                                    createdAt={item.createdAt}
                                    userName={item.user?.name}
                                    rating={item.rating?.rating}
                                />
                            )}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                            ListFooterComponent={<View style={{ height: 40 }} />}
                        />
                    ) : (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setSeeSpoilers(true)}
                            style={styles.spoilerGate}
                        >
                            <FontAwesome5 name="exclamation-triangle" size={16} color="#ff8888" iconStyle="solid" />
                            <Text style={styles.spoilerTitle}>Spoiler Warning</Text>
                            <Text style={styles.spoilerSub}>Tap to view comments</Text>
                        </TouchableOpacity>
                    )}

                </Animated.View>
            </Animated.ScrollView>

            {/* Back button */}
            <View style={[styles.backButtonAbsolute, { top: insets.top + 10 }]}>
                <CloseButton navigation={navigation} />
            </View>

            {/* Rating modal — re-rate from story detail */}
            <RatingModal
                visible={showRatingModal}
                storyId={storyID}
                storyTitle={story?.title ?? ''}
                artwork={displayImageUri}
                onClose={handleRatingModalClose}
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
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },

    backButtonAbsolute: {
        position: 'absolute',
        left: spacing.margin,
        zIndex: 20,
    },

    contentCard: {
        backgroundColor: '#111',
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
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        lineHeight: 30,
        letterSpacing: 0.2,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    author: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.65)',
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
        backgroundColor: '#1e1e1e',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    statText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
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
    },
    actionBtn: {
        padding: 4,
    },

    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#2a2a2a',
        marginVertical: 20,
    },

    summary: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 24,
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 22,
    },

    tagsSection: {
        marginTop: 20,
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
        borderRadius: 20,
        backgroundColor: '#1A4851a5',
        borderWidth: 0.5,
        borderColor: '#00ffffa5',
    },
    tagChipText: {
        color: 'cyan',
        fontSize: 13,
        textTransform: 'lowercase',
    },

    // ── Reactions ─────────────────────────────────────────────────────────────
    reactionsSection: {
        marginTop: 20,
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
        backgroundColor: '#1e1e1e',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    reactionEmoji: {
        fontSize: 18,
    },
    reactionCount: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
    },

    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
    },

    commentInput: {
        backgroundColor: '#1c1c1c',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        padding: 14,
        marginBottom: 16,
    },
    commentInputText: {
        color: '#fff',
        fontSize: 14,
        minHeight: 40,
    },
    postBtn: {
        alignSelf: 'flex-end',
        marginTop: 10,
        backgroundColor: 'cyan',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 7,
    },
    postBtnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 13,
    },

    spoilerGate: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,100,100,0.3)',
        backgroundColor: 'rgba(255,100,100,0.06)',
        gap: 6,
        marginBottom: 20,
    },
    spoilerTitle: {
        color: '#ff8888',
        fontSize: 16,
        fontWeight: '700',
    },
    spoilerSub: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
    },

    commentCard: {
        backgroundColor: '#1c1c1c',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2a2a2a',
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
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentUser: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        textTransform: 'capitalize',
    },
    commentDate: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
    },
    commentRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 'auto',
        backgroundColor: '#2a2a2a',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    commentRatingText: {
        fontSize: 12,
        color: '#C9A84C',
        fontWeight: '600',
    },
    commentContent: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 20,
    },
});

export default StoryScreen;