import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Animated, StyleSheet, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/common/AppText';

import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import Screen from '@/components/common/Screen';
import CloseButton from '../../components/common/CloseButton';
import { spacing } from '../../theme/spacing';
import { useApp } from '@/context/AppContext';
import { uploadProfilePicture } from '../../services/auth';

import { useFollowingCount } from '../../hooks/queries/useAuthorFollowing';

import { CachedImage } from '../../components/common/CachedImage';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';
import SectionLabel from '@/components/common/SectionLabel';
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
        <SectionLabel text={title} />
        <View style={styles.sectionCard}>{children}</View>
    </View>
);

const RowDivider = () => <View style={styles.divider} />;

const NavRow = ({ icon, title, description, onPress }: Omit<NavTile, 'id'>) => (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.row} accessibilityRole="button" accessibilityLabel={description ? `${title}, ${description}` : title}>
        <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
                <FontAwesome5 name={icon} size={iconSize.sm} color={colors.textSecondary} iconStyle="solid" />
            </View>
            <View>
                <Text style={styles.rowLabel}>{title}</Text>
                <Text style={styles.rowDescription}>{description}</Text>
            </View>
        </View>
        <FontAwesome5 name="chevron-right" size={iconSize.xs} color={colors.textSecondary} iconStyle="solid" />
    </TouchableOpacity>
);

    function formatHoursListened(seconds: number): string {
    const hours = seconds / 3600;
    const rounded = Math.round(hours * 10) / 10;
    return rounded % 1 === 0 ? `${rounded}` : `${rounded}`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const ProfileScreen = ({ navigation }: any) => {

    const { userId, profile, updateProfilePic } = useApp();
    const insets = useSafeAreaInsets();

    const { data: followingCount = 0 } = useFollowingCount();

    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [imageError, setImageError] = useState(false);

    const scrollY = useRef(new Animated.Value(0)).current;

    const AVATAR_SIZE   = 88;
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

    // ── Profile picture picker ────────────────────────────────────────────────
    const handleChangePhoto = async () => {
        Alert.alert(
            'Change Profile Photo',
            'Choose a photo source',
            [
                {
                    text: 'Camera',
                    onPress: () => pickImage('camera'),
                },
                {
                    text: 'Photo Library',
                    onPress: () => pickImage('library'),
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const pickImage = async (source: 'camera' | 'library') => {
        try {
            let result;

            if (source === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission required', 'Camera access is needed to take a photo.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission required', 'Photo library access is needed to select a photo.');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                });
            }

            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            setUploadingPhoto(true);

            // Upload to S3
            const s3Url = await uploadProfilePicture(
                userId!,
                asset.uri,
                asset.mimeType ?? 'image/jpeg'
            );

            // Update DynamoDB and local state
            await updateProfilePic(s3Url);

       } catch (err: any) {
        console.log('Photo upload error full:', JSON.stringify(err));
        console.log('Photo upload error message:', err?.message);
        console.log('Photo upload error name:', err?.name);
        Alert.alert('Error', err?.message || 'Failed to update profile photo. Please try again.');
    } finally {
            setUploadingPhoto(false);
        }
    };

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
            id: '3b',
            icon: 'tags',
            title: 'Your Genres',
            description: 'Choose what shows up in For You',
            onPress: () => navigation.navigate('EditGenresScreen'),
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
        {
            id: '6',
            icon: 'user-friends',
            title: 'Following',
            description: `${followingCount} author${followingCount !== 1 ? 's' : ''} followed`,
            onPress: () => navigation.navigate('AuthorFollowing'),
        },
    ];

    useEffect(() => {
        setImageError(false);
    }, [profile?.profilePicUri]);

    return (
        <Screen>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#0a0a14', '#0f1112', '#000']}
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

                    <View style={{ marginTop: 40, marginHorizontal: 20, width: 60 }}>
                        <CloseButton navigation={navigation} />
                    </View>

                    {/* ── Hero ── */}
                    <Animated.View style={[
                        styles.hero,
                        { paddingTop: 20, opacity: heroOpacity, transform: [{ translateY: heroTranslate }] }
                    ]}>

                        {/* Avatar */}
                        <View style={styles.avatarWrapper}>
                            {uploadingPhoto ? (
                                <View style={[
                                    styles.avatar,
                                    {
                                        width: AVATAR_SIZE,
                                        height: AVATAR_SIZE,
                                        borderRadius: AVATAR_SIZE / 2,
                                        backgroundColor: colors.surface3,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }
                                ]}>
                                    <ActivityIndicator color={colors.accent} />
                                </View>
                            ) : (
                                <CachedImage
                                    source={
                                        profile?.profilePicUri && !imageError
                                            ? { uri: profile.profilePicUri }
                                            : require('../../../assets/images/blankprofile.png')
                                    }
                                    onError={() => setImageError(true)}
                                    style={[styles.avatar, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}
                                />
                            )}
                            <TouchableOpacity
                                style={styles.avatarEdit}
                                activeOpacity={0.8}
                                onPress={handleChangePhoto}
                                disabled={uploadingPhoto}
                                accessibilityRole="button"
                                accessibilityLabel="Change profile photo"
                                accessibilityState={{ busy: uploadingPhoto }}
                                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                            >
                                <FontAwesome5 name="camera" size={iconSize.xs} color={colors.textOnAccent} iconStyle="solid" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.heroName}>
                            {profile?.name && profile.name !== 'user' ? profile.name : 'Listener'}
                        </Text>

                        {/* Stats row */}
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>
                                    {profile?.totalStoriesFinished ?? 0}
                                </Text>
                                <Text style={styles.statLabel}>Stories Completed</Text>
                            </View>

                            <View style={styles.statSeparator} />

                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>
                                    {formatHoursListened(profile?.totalListenSeconds ?? 0)}
                                </Text>
                                <Text style={styles.statLabel}>Hours Listened</Text>
                            </View>
                        </View>

                    </Animated.View>

                    {/* ── Navigation ── */}
                    <Section title="My Library">
                        {NAV_TILES.filter(t => ['2', '3', '3b', '6'].includes(t.id)).map((tile, i, arr) => (
                            <React.Fragment key={tile.id}>
                                <NavRow {...tile} />
                                {i < arr.length - 1 && <RowDivider />}
                            </React.Fragment>
                        ))}
                    </Section>

                    <Section title="Preferences">
                        {NAV_TILES.filter(t => ['1', '4', '5'].includes(t.id)).map((tile, i, arr) => (
                            <React.Fragment key={tile.id}>
                                <NavRow {...tile} />
                                {i < arr.length - 1 && <RowDivider />}
                            </React.Fragment>
                        ))}
                    </Section>

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
        backgroundColor: colors.surface3,
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
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#12121a',
    },
    heroName: {
        fontSize: fontSizes.title,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 20,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        backgroundColor: colors.surface2,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        width: width - spacing.margin * 4,
        paddingVertical: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: fontSizes.title,
        fontWeight: '700',
        color: colors.accent,
        opacity: 0.85,
    },
    statLabel: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
        marginTop: 2,
        fontWeight: '500',
    },
    statSeparator: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: colors.surface3,
        marginVertical: 4,
    },

    // ── Sections ──────────────────────────────────────────────────────────────
    section: {
        marginTop: 24,
        paddingHorizontal: spacing.margin,
    },
    sectionCard: {
        backgroundColor: colors.surface2,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
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
        borderRadius: radius.sm,
        backgroundColor: colors.surface3,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowLabel: {
        fontSize: fontSizes.body,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    rowDescription: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.surface3,
        marginLeft: 58,
    },

    // ── Sign out ──────────────────────────────────────────────────────────────
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: radius.lg,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    signOutText: {
        fontSize: fontSizes.body,
        fontWeight: '600',
        color: 'gray',
    },
});

export default ProfileScreen;