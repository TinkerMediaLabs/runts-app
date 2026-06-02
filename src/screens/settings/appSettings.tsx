import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Switch,
    TouchableOpacity,
    ScrollView,
    Modal,
    StyleSheet,
    Dimensions,
    TouchableWithoutFeedback,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MenuHeader from '../../components/common/MenuHeader';
import Screen from '../../components/common/Screen';
import { spacing } from '../../theme/spacing';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getFavoriteThreshold,
  saveFavoriteThreshold,
  DEFAULT_THRESHOLD,
  FAVORITE_THRESHOLD_KEY,
} from '../../hooks/queries/useFavoritedStories';

import {
getDefaultPlaybackSpeed,
saveDefaultPlaybackSpeed,
getAutoplayEnabled,
saveAutoplayEnabled,
} from '../../lib/audioSettings';

import { useQueryClient } from '@tanstack/react-query';

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SheetType = 'playbackSpeed' | 'favoriteThreshold' | null;

type PlaybackSpeed = 0.75 | 1 | 1.25 | 1.5 | 2;
type AudioQuality  = 'Low' | 'Standard' | 'High';

// ---------------------------------------------------------------------------
// Sub-components — shared with account.tsx
// ---------------------------------------------------------------------------

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionCard}>{children}</View>
    </View>
);

const RowDivider = () => <View style={styles.divider} />;

// Toggle row
const ToggleRow = ({
    icon,
    label,
    description,
    value,
    onChange,
}: {
    icon: any;
    label: string;
    description?: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) => (
    <View style={styles.row}>
        <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
                <FontAwesome5 name={icon} size={14} color="#ffffffa5" iconStyle="solid" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{label}</Text>
                {description ? (
                    <Text style={styles.rowDescription}>{description}</Text>
                ) : null}
            </View>
        </View>
        <Switch
            value={value}
            onValueChange={onChange}
            trackColor={{ false: '#333', true: 'rgba(0,255,255,0.4)' }}
            thumbColor={value ? 'cyan' : '#888'}
            ios_backgroundColor="#333"
        />
    </View>
);

// Value selection row (opens a sheet)
const SelectRow = ({
    icon,
    label,
    value,
    onPress,
}: {
    icon: any;
    label: string;
    value: string;
    onPress: () => void;
}) => (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.row}>
        <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
                <FontAwesome5 name={icon} size={14} color="#ffffffa5" iconStyle="solid" />
            </View>
            <Text style={styles.rowLabel}>{label}</Text>
        </View>
        <View style={styles.rowRight}>
            <Text style={styles.rowValue}>{value}</Text>
            <FontAwesome5 name="chevron-right" size={11} color="#ffffff40" iconStyle="solid" />
        </View>
    </TouchableOpacity>
);

// Bottom sheet wrapper — identical pattern to account.tsx
const Sheet = ({
    visible,
    onClose,
    title,
    children,
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}) => {
    const insets = useSafeAreaInsets();
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.sheetBackdrop} />
            </TouchableWithoutFeedback>

            <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>{title}</Text>
                    <TouchableOpacity
                        onPress={onClose}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <FontAwesome5 name="times" size={16} color="#ffffffa5" iconStyle="solid" />
                    </TouchableOpacity>
                </View>
                {children}
            </View>
        </Modal>
    );
};

// Option pill used inside selection sheets
const OptionPill = ({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.optionPill, active && styles.optionPillActive]}
    >
        <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>
            {label}
        </Text>
        {active && (
            <FontAwesome5 name="check" size={13} color="cyan" iconStyle="solid" style={{ marginLeft: 8 }} />
        )}
    </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const AppSettings = ({ navigation }: any) => {


    // ── Sheet state ───────────────────────────────────────────────────────────
    const [activeSheet, setActiveSheet] = useState<SheetType>(null);
    const open  = (sheet: SheetType) => setActiveSheet(sheet);
    const close = () => setActiveSheet(null);

    // ── Content settings ──────────────────────────────────────────────────────
    const [nsfwEnabled, setNsfwEnabled]     = useState(false);
    const [autoPlay, setAutoPlay]           = useState(false);
    const [downloadOnWifi, setDownloadOnWifi] = useState(true);

    // ── Playback settings ─────────────────────────────────────────────────────
    const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
    const [sleepTimer, setSleepTimer]       = useState(false);
    const [skipSilence, setSkipSilence]     = useState(false);

    // ── Audio settings ────────────────────────────────────────────────────────
    const [audioQuality, setAudioQuality]   = useState<AudioQuality>('Standard');
    const [boostVolume, setBoostVolume]     = useState(false);

    // ── Notification settings ─────────────────────────────────────────────────
    const [newReleases, setNewReleases]     = useState(true);
    const [recommendations, setRecommendations] = useState(true);
    const [activityAlerts, setActivityAlerts] = useState(false);

    // ── Appearance ────────────────────────────────────────────────────────────
    const [reducedMotion, setReducedMotion] = useState(false);

    const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.75, 1, 1.25, 1.5, 2];
    const AUDIO_QUALITIES: AudioQuality[]  = ['Low', 'Standard', 'High'];

    const queryClient = useQueryClient();
    const [favoriteThreshold, setFavoriteThreshold] = useState(DEFAULT_THRESHOLD);

    useEffect(() => {
        getFavoriteThreshold().then(setFavoriteThreshold);

        getDefaultPlaybackSpeed().then(v => setPlaybackSpeed(v as PlaybackSpeed));
        }, []);

        getAutoplayEnabled().then(setAutoPlay);

        const handleThresholdChange = async (value: number) => {
            setFavoriteThreshold(value);
        await saveFavoriteThreshold(value);
        // Invalidate so FavoritesList refetches with new threshold
        queryClient.invalidateQueries({ queryKey: ['favoritedStories'] });
        close();
    };

    const handleAutoPlayChange = async (value: boolean) => {
        setAutoPlay(value);
        await saveAutoplayEnabled(value);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Screen>
            <LinearGradient
                colors={['#000', '#12121a', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >
                <MenuHeader title="Settings" navigation={navigation} />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >

                    {/* ── Library ── */}
                    <Section title="Library">
                    <SelectRow
                        icon="star"
                        label="Favorites Threshold"
                        value={`${favoriteThreshold}★ and above`}
                        onPress={() => open('favoriteThreshold')}
                    />
                    </Section>

                    {/* ── Content ── */}
                    <Section title="Content">
                        <ToggleRow
                            icon="fire"
                            label="Mature Content"
                            description="Show stories marked as NSFW"
                            value={nsfwEnabled}
                            onChange={setNsfwEnabled}
                        />
                       <RowDivider />
                        <ToggleRow
                            icon="play-circle"
                            label="Autoplay Playlist"
                            description="Automatically play the next pinned story when one finishes"
                            value={autoPlay}
                            onChange={handleAutoPlayChange}
                        />
                    </Section>

                    {/* ── Playback ── */}
                    <Section title="Playback">
                        <SelectRow
                            icon="tachometer-alt"
                            label="Default Speed"
                            value={`${playbackSpeed}x`}
                            onPress={() => open('playbackSpeed')}
                        />
                        {/* <RowDivider /> */}
                        {/* <ToggleRow
                            icon="forward"
                            label="Skip Silence"
                            description="Automatically skip quiet gaps"
                            value={skipSilence}
                            onChange={setSkipSilence}
                        />
                        <RowDivider /> */}
                        {/* <ToggleRow
                            icon="moon"
                            label="Sleep Timer"
                            description="Stop playback after a set time"
                            value={sleepTimer}
                            onChange={setSleepTimer}
                        /> */}
                    </Section>

                    {/* ── Audio ── */}
                    <Section title="Audio">
                        {/* <SelectRow
                            icon="sliders-h"
                            label="Streaming Quality"
                            value={audioQuality}
                            onPress={() => open('audioQuality')}
                        />
                        <RowDivider /> */}
                        <ToggleRow
                            icon="volume-up"
                            label="Volume Boost"
                            description="Increase loudness for quiet recordings"
                            value={boostVolume}
                            onChange={setBoostVolume}
                        />
                        <RowDivider />
                        {/* <ToggleRow
                            icon="wifi"
                            label="Download on Wi-Fi Only"
                            description="Prevent downloads on mobile data"
                            value={downloadOnWifi}
                            onChange={setDownloadOnWifi}
                        /> */}
                    </Section>

                    {/* ── Notifications ── */}
                    {/* <Section title="Notifications">
                        <ToggleRow
                            icon="bell"
                            label="New Releases"
                            description="Authors you follow publish new stories"
                            value={newReleases}
                            onChange={setNewReleases}
                        />
                        <RowDivider />
                        <ToggleRow
                            icon="star"
                            label="Recommendations"
                            description="Personalised picks based on your listening"
                            value={recommendations}
                            onChange={setRecommendations}
                        />
                        <RowDivider />
                        <ToggleRow
                            icon="comment"
                            label="Activity Alerts"
                            description="Likes, comments, and follows"
                            value={activityAlerts}
                            onChange={setActivityAlerts}
                        />
                    </Section> */}

                    {/* ── Accessibility ── */}
                    {/* <Section title="Accessibility">
                        <ToggleRow
                            icon="adjust"
                            label="Reduce Motion"
                            description="Minimise animations throughout the app"
                            value={reducedMotion}
                            onChange={setReducedMotion}
                        />
                    </Section> */}

                    <Text style={styles.version}>Version 1.0.0</Text>

                </ScrollView>
            </LinearGradient>

            {/* ── Playback speed sheet ── */}
            <Sheet
                visible={activeSheet === 'playbackSpeed'}
                onClose={close}
                title="Default Playback Speed"
            >
                <Text style={styles.sheetNote}>
                    Applied when you start a new story. You can still change speed during playback.
                </Text>
                {PLAYBACK_SPEEDS.map((speed) => (
                    <OptionPill
                        key={speed}
                        label={`${speed}x`}
                        active={playbackSpeed === speed}
                        onPress={() => {
                        setPlaybackSpeed(speed);
                        saveDefaultPlaybackSpeed(speed);
                        close();
                        }}
                    />
                ))}
            </Sheet>

            {/* ── Audio quality sheet ── */}
            {/* <Sheet
                visible={activeSheet === 'audioQuality'}
                onClose={close}
                title="Streaming Quality"
            >
                <Text style={styles.sheetNote}>
                    Higher quality uses more data. Downloads are always at the highest available quality.
                </Text>
                {AUDIO_QUALITIES.map((q) => (
                    <OptionPill
                        key={q}
                        label={q}
                        active={audioQuality === q}
                        onPress={() => { setAudioQuality(q); close(); }}
                    />
                ))}
            </Sheet> */}

            {/* ── Favorite threshold sheet ── */}
            <Sheet
            visible={activeSheet === 'favoriteThreshold'}
            onClose={close}
            title="Favorites Threshold"
            >
            <Text style={styles.sheetNote}>
                Stories you rate at or above this threshold are automatically added to your Favorites.
            </Text>
            {[7, 8, 9, 10].map(value => (
                <OptionPill
                key={value}
                label={`${value} stars and above`}
                active={favoriteThreshold === value}
                onPress={() => handleThresholdChange(value)}
                />
            ))}
            </Sheet>

        </Screen>
    );
};

// ---------------------------------------------------------------------------
// Styles — mirrors account.tsx
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    scrollContent: {
        paddingBottom: 60,
    },

    section: {
        marginTop: 28,
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
        lineHeight: 17,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rowValue: {
        fontSize: 14,
        color: '#ffffff50',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#2a2a2a',
        marginLeft: 58,
    },

    // Sheet
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#111',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 12,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: '#2a2a2a',
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ffffff30',
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    sheetNote: {
        fontSize: 13,
        color: '#ffffff70',
        lineHeight: 20,
        marginBottom: 20,
    },

    // Option pills
    optionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 8,
    },
    optionPillActive: {
        backgroundColor: 'rgba(0,255,255,0.08)',
        borderColor: 'cyan',
    },
    optionPillText: {
        fontSize: 15,
        color: '#ccc',
        fontWeight: '500',
    },
    optionPillTextActive: {
        color: 'cyan',
        fontWeight: '600',
    },

    version: {
        textAlign: 'center',
        color: '#ffffff25',
        fontSize: 12,
        marginTop: 40,
    },
});

export default AppSettings;