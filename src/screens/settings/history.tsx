import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SkeletonRows } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { View, FlatList, RefreshControl, ActivityIndicator, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '@/components/common/AppText';

import Screen from '@/components/common/Screen';
import { useApp } from '@/context/AppContext';
import MenuHeader from '../../components/common/MenuHeader';
import StoryTile from '../../components/story/StoryTile';
import FavoritesList from '../../components/story/FavoritesList';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useFinishedStories } from '../../hooks/queries/useFinishedStories';
import { useAuthor } from '../../hooks/queries/useAuthors';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { spacing } from '../../theme/spacing';
import { useTag } from '../../hooks/queries/useTagNames';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import Icon from '@/components/common/Icon';

const client = generateClient<Schema>();
const { width } = Dimensions.get('window');

// Two lists on one screen: everything the listener has finished, and their favorites (stories rated at or above the
// favorites threshold in app settings). The favorites list is the same list that used to be a tab on the playlist.
type TabId = 'history' | 'favorites';
const TABS: { id: TabId; label: string }[] = [
    { id: 'history',   label: 'All history' },
    { id: 'favorites', label: 'Favorites'   },
];

// ---------------------------------------------------------------------------
// Per-tile wrapper
// ---------------------------------------------------------------------------

const HistoryStoryTile = ({
    item,
}: {
    item: any;
}) => {
    const [story, setStory] = useState<any>(null);

    useEffect(() => {
        async function fetchStory() {
            try {
                const { data } = await client.models.Story.get({ id: item.storyId });
                setStory(data);
            } catch (e) {
                console.log('Error fetching history story:', e);
            }
        }
        fetchStory();
    }, [item.storyId]);

    const { data: resolvedImageUri } = useStoryImage(
        story?.imageUri?.startsWith('stories/') ? story.imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? story?.imageUri ?? '';

    const { data: primaryTagData }   = useTag(story?.primaryTagId);
    const { data: secondaryTagData } = useTag(story?.secondaryTagId);

    const { data: authorData } = useAuthor(story?.authorId ?? '');

    if (!story) return null;

    return (
        <StoryTile
            title={story.title}
            imageUri={displayImageUri}
            primaryTag={primaryTagData?.name ?? ''}
            secondaryTag={secondaryTagData?.name ?? ''}
            audioUri={story.audioUri ?? ''}
            summary={story.summary ?? ''}
            author={authorData?.name ?? ''}
            description={story.description ?? ''}
            duration={story.duration ?? 0}
            id={story.id}
            numListens={story.numListens ?? 0}
            licenseType={story.licenseType}
            universeId={story.universeId}
            sequenceNumber={story.sequenceNumber}
        />
    );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const History = ({ navigation }: any) => {

    const { userId } = useApp();

    const { data: finishedPages, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useFinishedStories();
    const finishedStories = useMemo(() => finishedPages?.pages.flatMap(p => p.items) ?? [], [finishedPages]);
    const [isFetching, setIsFetching] = useState(false);

    const [activeTab, setActiveTab] = useState<TabId>('history');
    const indicatorX = useRef(new Animated.Value(0)).current;
    const TAB_WIDTH  = width / TABS.length;
    const handleTabPress = (tab: TabId, index: number) => {
        setActiveTab(tab);
        Animated.spring(indicatorX, { toValue: index * TAB_WIDTH, damping: 20, stiffness: 200, useNativeDriver: true }).start();
    };


    const onRefresh = async () => {
        setIsFetching(true);
        await refetch();
        setIsFetching(false);
    };

    const renderItem = ({ item }: any) => (
        <HistoryStoryTile
            item={item}
        />
    );

    return (
        <Screen>
            <View style={{ flex: 1, backgroundColor: colors.surface0 }}>
                <MenuHeader title="History" navigation={navigation} />

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
                                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    <Animated.View style={[styles.indicator, { width: TAB_WIDTH, transform: [{ translateX: indicatorX }] }]} />
                </View>

                {activeTab === 'favorites' ? (
                    <FavoritesList tabBarHeight={60} />
                ) : isLoading ? (
                    <SkeletonRows count={7} />
                ) : (
                    <FlatList
                        data={finishedStories}
                        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
                        onEndReachedThreshold={0.5}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={isFetching}
                                onRefresh={onRefresh}
                                tintColor={colors.accent}
                            />
                        }
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <EmptyState
                                icon={<Icon name="history" size={40} color={colors.textSecondary} />}
                                title="No listening history yet"
                                body="Stories you finish will appear here."
                            />
                        }
                        ListFooterComponent={
                            <View style={{ height: 100, paddingTop: 16 }}>
                                {isFetchingNextPage ? <ActivityIndicator color={colors.accent} /> : null}
                            </View>
                        }
                    />
                )}
            </View>
        </Screen>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        position: 'relative',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        marginBottom: 8,
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
        gap: 8,
    },
    emptyText: {
        color: colors.textPrimary,
        fontSize: fontSizes.body,
        fontWeight: '600',
    },
    emptyHint: {
        color: colors.textSecondary,
        fontSize: fontSizes.small,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default History;