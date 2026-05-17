import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    FlatList,
    StyleSheet,
    Dimensions,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
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
import dummystories from '../../../dummydata/stories';

const { width } = Dimensions.get('window');
const AVATAR_SIZE   = 100;
const HEADER_H      = 260; // height before sticky bar kicks in
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
// Screen
// ---------------------------------------------------------------------------

const CreatorProfile = (id: any) => {

    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [following, setFollowing] = useState(false);
    const [stories] = useState(dummystories);

    const [author] = useState({
        name: 'John Doe',
        profilePicUri: '',
        bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        tikTok: 'www.example.com/johndoe',
        website: 'www.example.com/johndoe',
        instagram: 'www.example.com/johndoe',
        reddit: 'www.example.com/johndoe',
        deviantArt: 'www.example.com/johndoe',
        facebook: 'www.example.com/johndoe',
        youTube: 'www.example.com/johndoe',
        email: 'johndoe@example.com',
    });

    // ── Scroll animation ──────────────────────────────────────────────────────
    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => { scrollY.value = e.contentOffset.y; },
    });

    // Top bar fades in background + title
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

    // Header parallax + fade
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

    // ── Render ────────────────────────────────────────────────────────────────
    const renderItem = ({ item }: any) => (
        <StoryTile
            title={item.title}
            imageUri={item.imageUri}
            primaryTag={item.primaryTag}
            audioUri={item.audioUri}
            summary={item.summary}
            description={item.description}
            author={item.author}
            duration={item.duration}
            id={item.id}
            numListens={item.numListens}
        />
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
                    {author.name}
                </Animated.Text>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setFollowing(f => !f)}
                    style={[styles.followBtn, following && styles.followBtnActive]}
                >
                    <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                        {following ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            </Animated.View>

            {/* ── Main list ── */}
            <AnimatedFlatList
                data={stories}
                renderItem={renderItem}
                keyExtractor={(item: any) => item.id}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}

                ListHeaderComponent={
                    <Animated.View style={[styles.header, headerStyle, { paddingTop: insets.top + 60 }]}>

                        {/* Background gradient behind the header */}
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
                                    author.profilePicUri
                                        ? { uri: author.profilePicUri }
                                        : require('../../../assets/images/blankprofile.png')
                                }
                                style={styles.avatar}
                            />
                            {/* Subtle cyan ring */}
                            <View style={styles.avatarRing} />
                        </View>

                        {/* Name */}
                        <Text style={styles.name}>{author.name}</Text>

                        {/* Stats row */}
                        <View style={styles.statsRow}>
                            <StatPill icon="book-open" label={`${stories.length} Stories`} />
                            <StatPill icon="headphones" label="2.4k Listens" />
                        </View>

                        {/* Follow button (large, in header) */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => setFollowing(f => !f)}
                            style={[styles.followBtnLarge, following && styles.followBtnLargeActive]}
                        >
                            <Text style={[styles.followBtnLargeText, following && styles.followBtnLargeTextActive]}>
                                {following ? '✓  Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>

                        {/* Bio */}
                        <Text style={styles.bio}>{author.bio}</Text>

                        {/* Socials */}
                        <View style={styles.socialsWrapper}>
                            <SocialBlock
                                tikTok={author.tikTok}
                                website={author.website}
                                instagram={author.instagram}
                                reddit={author.reddit}
                                deviantArt={author.deviantArt}
                                facebook={author.facebook}
                                youTube={author.youTube}
                                email={author.email}
                            />
                        </View>

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

    // ── Top bar ───────────────────────────────────────────────────────────────
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

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 32,
        overflow: 'hidden',
    },

    // Avatar
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

    // Name
    name: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 12,
        letterSpacing: 0.2,
    },

    // Stats
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

    // Follow button (large, in header)
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

    // Bio
    bio: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },

    // Socials
    socialsWrapper: {
        marginBottom: 28,
    },

    // Stories label
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