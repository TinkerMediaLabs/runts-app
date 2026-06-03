import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
    Dimensions,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import StoryTileList from '../../components/story/StoryTileList';
import { spacing } from '../../theme/spacing';
import { useApp } from '@/context/AppContext';

import FavoritesList from '../../components/story/FavoritesList';
import BookmarkList from '../../components/story/BookmarkList';

const { width } = Dimensions.get('window');

type TabId = 'pinned' | 'favorites' | 'bookmarked';
type Tab   = { id: TabId; label: string };

const TABS: Tab[] = [
    { id: 'pinned',      label: 'Pinned'      },
    { id: 'favorites',   label: 'Favorites'   },
    { id: 'bookmarked',  label: 'Bookmarked'  },
];

const EmptyState = ({ icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
    <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
            <FontAwesome5 name={icon} size={28} color="#ffffff20" iconStyle="solid" />
        </View>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
);

const PlaylistScreen = () => {

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
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <LinearGradient
                colors={['#13192c', '#161616', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >

                {/* ── Header ── */}
                <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                    <View style={styles.headerRow}>
                        <Text style={styles.headerTitle}>My Library</Text>

                        {/* Reorder toggle — only shown on list tabs */}
                        {/* Reorder toggle — only shown on pinned tab */}
                            {activeTab === 'pinned' && (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => setReorderEnabled(!reorderEnabled)}
                                style={[styles.reorderButton, reorderEnabled && styles.reorderButtonActive]}
                            >
                                <FontAwesome5
                                name="sort"
                                size={14}
                                color={reorderEnabled ? '#000' : '#ffffffa5'}
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
                        <FontAwesome5 name="grip-lines" size={11} color="#ffffff50" iconStyle="solid" />
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
        paddingHorizontal: spacing.margin * 2,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.3,
    },

    reorderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#333',
    },
    reorderButtonActive: {
        backgroundColor: 'cyan',
        borderColor: 'cyan',
    },
    reorderLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#ffffffa5',
    },
    reorderLabelActive: {
        color: '#000',
    },

    reorderHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: spacing.margin * 2,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,255,255,0.06)',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,255,255,0.15)',
    },
    reorderHintText: {
        fontSize: 12,
        color: '#ffffff50',
    },

    tabBar: {
        flexDirection: 'row',
        position: 'relative',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#2a2a2a',
    },
    tab: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ffffff40',
    },
    tabLabelActive: {
        color: '#fff',
        fontWeight: '700',
    },
    indicator: {
        position: 'absolute',
        bottom: -StyleSheet.hairlineWidth,
        height: 2,
        backgroundColor: 'cyan',
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
        borderRadius: 18,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff60',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#ffffff30',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default PlaylistScreen;