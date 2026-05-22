import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    Animated,
    StyleSheet,
    Dimensions,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Screen from '@/components/common/Screen';
import CloseButton from '../../components/common/CloseButton';
import { spacing } from '../../theme/spacing';
import { useApp } from '@/context/AppContext';

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NavTile = {
    id: string;
    icon: any;
    title: string;
    description: string;
    onPress: () => void;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionCard}>{children}</View>
    </View>
);

const RowDivider = () => <View style={styles.divider} />;

const NavRow = ({ icon, title, description, onPress }: Omit<NavTile, 'id'>) => (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.row}>
        <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
                <FontAwesome5 name={icon} size={14} color="#ffffffa5" iconStyle="solid" />
            </View>
            <View>
                <Text style={styles.rowLabel}>{title}</Text>
                <Text style={styles.rowDescription}>{description}</Text>
            </View>
        </View>
        <FontAwesome5 name="chevron-right" size={11} color="#ffffff40" iconStyle="solid" />
    </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const ProfileScreen = ({ navigation }: any) => {

    const { userId, isAuthenticated, logout } = useApp();
    const insets = useSafeAreaInsets();

    const [user] = useState({
        name: 'Listener',
        imageUri: null as string | null,
        numFollowing: 0,
        storiesListened: 0,
        hoursListened: 0,
    });

    const scrollY = useRef(new Animated.Value(0)).current;

    const AVATAR_SIZE   = 88;
    const HERO_HEIGHT   = 220;
    const FADE_START    = 80;
    const FADE_END      = 160;

    const heroOpacity = scrollY.interpolate({
        inputRange: [FADE_START, FADE_END],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const heroTranslate = scrollY.interpolate({
        inputRange: [0, FADE_END],
        outputRange: [0, -24],
        extrapolate: 'clamp',
    });

    const NAV_TILES: NavTile[] = [
        {
            id: '1',
            icon: 'user-cog',
            title: 'Account',
            description: 'Manage your name, email, and password',
            onPress: () => navigation.navigate('AccountScreen'),
        },
        {
            id: '2',
            icon: 'play-circle',
            title: 'Continue Listening',
            description: 'Pick up where you left off',
            onPress: () => navigation.navigate('InProgressScreen'),
        },
        {
            id: '3',
            icon: 'history',
            title: 'Listening History',
            description: 'Everything you\'ve listened to',
            onPress: () => navigation.navigate('HistoryScreen'),
        },
        {
            id: '4',
            icon: 'cog',
            title: 'App Settings',
            description: 'Playback, notifications, and more',
            onPress: () => navigation.navigate('AppSettingsScreen'),
        },
        {
            id: '5',
            icon: 'info-circle',
            title: 'About',
            description: 'Version, legal, and support',
            onPress: () => navigation.navigate('AboutScreen'),
        },
    ];

    return (
        <Screen>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#000', '#12121a', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >

                <Animated.ScrollView
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: true }
                    )}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
                >

                  <View style={{marginTop:40, marginHorizontal: 20, width: 60,}}>
                    <CloseButton navigation={navigation} />
                  </View>

                    {/* ── Hero ── */}
                    <Animated.View style={[
                        styles.hero,
                        { paddingTop: 20, opacity: heroOpacity, transform: [{ translateY: heroTranslate }] }
                    ]}>

                        {/* Avatar */}
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={
                                    user.imageUri
                                        ? { uri: user.imageUri }
                                        : require('../../../assets/images/blankprofile.png')
                                }
                                style={[styles.avatar, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}
                            />
                            <TouchableOpacity style={styles.avatarEdit} activeOpacity={0.8}>
                                <FontAwesome5 name="camera" size={11} color="#000" iconStyle="solid" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.heroName}>
                            {user.name}
                        </Text>

                        {/* Stats row */}
                        <View style={styles.statsRow}>
                            <TouchableOpacity
                                style={styles.statItem}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('AuthorFollowing')}
                            >
                                <Text style={styles.statValue}>{user.numFollowing}</Text>
                                <Text style={styles.statLabel}>Following</Text>
                            </TouchableOpacity>

                            <View style={styles.statSeparator} />

                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{user.storiesListened}</Text>
                                <Text style={styles.statLabel}>Stories</Text>
                            </View>

                            <View style={styles.statSeparator} />

                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{user.hoursListened}h</Text>
                                <Text style={styles.statLabel}>Listened</Text>
                            </View>
                        </View>

                    </Animated.View>

                    {/* ── Navigation ── */}
                    <Section title="My Library">
                        {NAV_TILES.filter(t => ['2','3'].includes(t.id)).map((tile, i, arr) => (
                            <React.Fragment key={tile.id}>
                                <NavRow {...tile} />
                                {i < arr.length - 1 && <RowDivider />}
                            </React.Fragment>
                        ))}
                    </Section>

                    <Section title="Preferences">
                        {NAV_TILES.filter(t => ['1','4','5'].includes(t.id)).map((tile, i, arr) => (
                            <React.Fragment key={tile.id}>
                                <NavRow {...tile} />
                                {i < arr.length - 1 && <RowDivider />}
                            </React.Fragment>
                        ))}
                    </Section>

                    {/* ── Sign out ── */}
                    {/* <View style={[styles.section, { marginTop: 32 }]}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={logout}
                            style={styles.signOutButton}
                        >
                            <FontAwesome5 name="sign-out-alt" size={14} color="gray" iconStyle="solid" style={{ marginRight: 10 }} />
                            <Text style={styles.signOutText}>Sign Out</Text>
                        </TouchableOpacity>
                    </View> */}

                </Animated.ScrollView>
            </LinearGradient>
        </Screen>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    // ── Hero ──────────────────────────────────────────────────────────────────
    hero: {
        alignItems: 'center',
        paddingBottom: 28,
        paddingHorizontal: spacing.margin,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 14,
    },
    avatar: {
        backgroundColor: '#2a2a2a',
        borderWidth: 2,
        borderColor: 'rgba(0,255,255,0.2)',
    },
    avatarEdit: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'cyan',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#12121a',
    },
    heroName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 20,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        width: width - spacing.margin * 4,
        paddingVertical: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: 'cyan',
        opacity: 0.85,
    },
    statLabel: {
        fontSize: 12,
        color: '#ffffff60',
        marginTop: 2,
        fontWeight: '500',
    },
    statSeparator: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: '#2a2a2a',
        marginVertical: 4,
    },

    // ── Sections ──────────────────────────────────────────────────────────────
    section: {
        marginTop: 24,
        paddingHorizontal: spacing.margin,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: '#ffffff50',
        marginBottom: 10,
        marginLeft: 4,
    },
    sectionCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        overflow: 'hidden',
    },

    // ── Rows ─────────────────────────────────────────────────────────────────
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 56,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    rowIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowLabel: {
        fontSize: 15,
        color: '#fff',
        fontWeight: '500',
    },
    rowDescription: {
        fontSize: 12,
        color: '#ffffff50',
        marginTop: 2,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#2a2a2a',
        marginLeft: 58,
    },

    // ── Sign out ──────────────────────────────────────────────────────────────
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    signOutText: {
        fontSize: 15,
        fontWeight: '600',
        color: 'gray',
    },
});

export default ProfileScreen;