import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { Text } from '@/components/common/AppText';

import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import StoryTileList from '../../components/story/StoryTileList';
import { useApp } from '@/context/AppContext';

import FavoritesList from '../../components/story/FavoritesList';
import BookmarkList from '../../components/story/BookmarkList';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useTipTarget } from '../../tips/useTipTarget';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

const { width } = Dimensions.get('window');

type TabId = 'pinned' | 'favorites' | 'bookmarked';
type Tab   = { id: TabId; label: string };

const TABS: Tab[] = [
    { id: 'pinned',      label: 'Pinned'      },
    { id: 'favorites',   label: 'Favorites'   },
    { id: 'bookmarked',  label: 'Bookmarks'  },
];

const EmptyState = ({ icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
    <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
            <FontAwesome5 name={icon} size={28} color={colors.textSecondary} iconStyle="solid" />
        </View>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
);

const PlaylistScreen = () => {
    const reorderTipRef = useTipTarget('reorder-button');

    const { userId } = useApp();
    const insets        = useSafeAreaInsets();
    const tabBarHeight  = useBottomTabBarHeight();

    const [activeTab, setActiveTab]         = useState<TabId>('pinned');
    const [reorderEnabled, setReorderEnabled] = useState(false);

    const indicatorX = useRef(new Animated.Value(0)).current;
    const TAB_WIDTH  = width / TABS.length;

    const handleTabPress = (tab: TabId, index: number) => {
        setActiveTab(tab);
        setReorderEnabled(false); // reset reorder when switching tabs
        Animated.spring(indicatorX, {
            toValue: index * TAB_WIDTH,
            damping: 20,
            stiffness: 200,
            useNativeDriver: true,
        }).start();
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.surface0 }}>
            <LinearGradient
                colors={['#000', '#0f1112', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >

                {/* ── Header ── */}
                <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                    <View style={styles.headerRow}>
                        <Text style={styles.headerTitle}>My Library</Text>

                        {/* Reorder toggle — only shown on list tabs */}
                        {/* Reorder toggle — only shown on pinned tab */}
                            {activeTab === 'pinned' && (
                            <TouchableOpacity
                                ref={reorderTipRef as any}
                                activeOpacity={0.7}
                                onPress={() => setReorderEnabled(!reorderEnabled)}
                                style={[styles.reorderButton, reorderEnabled && styles.reorderButtonActive]}
                                accessibilityRole="button"
                                accessibilityLabel={reorderEnabled ? 'Finish reordering' : 'Reorder pinned stories'}
                                accessibilityState={{ selected: reorderEnabled }}
                            >
                                <FontAwesome5
                                name="sort"
                                size={iconSize.sm}
                                color={reorderEnabled ? '#000' : colors.textSecondary}
                                iconStyle="solid"
                                />
                                <Text style={[styles.reorderLabel, reorderEnabled && styles.reorderLabelActive]}>
                                {reorderEnabled ? 'Done' : 'Reorder'}
                                </Text>
                            </TouchableOpacity>
                            )}
                    </View>

                    {/* ── Tab bar ── */}
                    <View style={styles.tabBar}>
                        {TABS.map((tab, index) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    activeOpacity={0.7}
                                    onPress={() => handleTabPress(tab.id, index)}
                                    style={[styles.tab, { width: TAB_WIDTH }]}
                                    accessibilityRole="tab"
                                    accessibilityLabel={tab.label}
                                    accessibilityState={{ selected: isActive }}
                                >
                                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        <Animated.View
                            style={[
                                styles.indicator,
                                { width: TAB_WIDTH, transform: [{ translateX: indicatorX }] },
                            ]}
                        />
                    </View>
                </View>

                {/* Reorder hint */}
                {activeTab === 'pinned' && reorderEnabled && (
                    <View style={styles.reorderHint}>
                        <FontAwesome5 name="grip-lines" size={iconSize.xs} color={colors.textSecondary} iconStyle="solid" />
                        <Text style={styles.reorderHintText}>Hold and drag items to reorder</Text>
                    </View>
                )}

                {/* ── Content ── */}
                <View style={styles.content}>

                    {activeTab === 'pinned' && (
                        <StoryTileList reorderEnabled={reorderEnabled} tabBarHeight={tabBarHeight} />
                    )}

                    {activeTab === 'favorites' && (
                        <FavoritesList tabBarHeight={tabBarHeight} />
                    )}

                    {activeTab === 'bookmarked' && (
                        <BookmarkList tabBarHeight={tabBarHeight} />
                    )}

                </View>

            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({

    header: {
        paddingHorizontal: 0,
        paddingBottom: 0,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.margin,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: fontSizes.headline,
        fontWeight: '600',
        color: colors.textPrimary,
        letterSpacing: 0.3,
    },

    reorderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.xl,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    reorderButtonActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    reorderLabel: {
        fontSize: fontSizes.small,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    reorderLabelActive: {
        color: colors.textOnAccent,
    },

    reorderHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: spacing.margin,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,255,255,0.06)',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,255,255,0.15)',
    },
    reorderHintText: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
    },

    tabBar: {
        flexDirection: 'row',
        position: 'relative',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    tab: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: fontSizes.small,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    tabLabelActive: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    indicator: {
        position: 'absolute',
        bottom: -StyleSheet.hairlineWidth,
        height: 2,
        backgroundColor: colors.accent,
        borderRadius: 1,
    },

    content: {
        flex: 1,
        marginTop: 8,
    },

    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.margin * 4,
        marginTop: -60,
    },
    emptyIconWrap: {
        width: 64,
        height: 64,
        borderRadius: radius.xl,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: fontSizes.subtitle,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default PlaylistScreen;