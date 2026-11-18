import React, { useState, useEffect, useMemo } from 'react';
import { View, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

import StoryTile from './StoryTile';
import EmptyState from '../common/EmptyState';
import { SkeletonRows } from '../common/Skeleton';
import { navigate } from '@/navigation/RootNavigator';
import { useApp } from '@/context/AppContext';
import { usePinnedStories } from '../../hooks/queries/usePinnedStories';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useAuthor } from '../../hooks/queries/useAuthors';
import { useStory } from '../../hooks/queries/useStories';
import { useTag } from '../../hooks/queries/useTagNames';
import { unwrap } from '@/lib/amplifyResult';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import Icon from '@/components/common/Icon';

const client = generateClient<Schema>();

type StoryTileListProps = {
    reorderEnabled?: boolean;
    tabBarHeight?: number;
};

// ---------------------------------------------------------------------------
// Per-tile wrapper — resolves story data + S3 image
// ---------------------------------------------------------------------------
const PinnedStoryTile = ({
    item,
    reorderEnabled,
    drag,
    isActive,
    isFirst,
}: {
    item: any;
    isFirst?: boolean;
    reorderEnabled: boolean;
    drag?: () => void;
    isActive?: boolean;
}) => {
    const { data: story } = useStory(item.storyId);

    const { data: resolvedImageUri } = useStoryImage(
        story?.imageUri?.startsWith('stories/') ? story.imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? story?.imageUri ?? '';

    const { data: primaryTagData }   = useTag(story?.primaryTagId);
    const { data: secondaryTagData } = useTag(story?.secondaryTagId);

    const { data: authorData } = useAuthor(story?.authorId ?? '');

    // A placeholder of about the same height (not nothing), so a row never starts at zero height and pushes the list around.
    if (!story) return <SkeletonRows count={1} />;

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
            reorderEnabled={reorderEnabled}
            drag={reorderEnabled ? drag : undefined}
            isActive={isActive}
            isPremium={story.isPremium}
            licenseType={item.licenseType}
            universeId={item.universeId}
            sequenceNumber={item.sequenceNumber}
            tipTarget={isFirst ? 'story-tile' : undefined}
        />
    );
};

// ---------------------------------------------------------------------------
// Main list
// ---------------------------------------------------------------------------

const StoryTileList = ({ reorderEnabled = false, tabBarHeight = 80 }: StoryTileListProps) => {

    const { userId } = useApp();

    const { data: pinnedPages, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = usePinnedStories();
    const pinnedStories = useMemo(() => pinnedPages?.pages.flatMap(p => p.items), [pinnedPages]);

    const [isFetching, setIsFetching] = useState(false);
    const [localData, setLocalData]   = useState<any[]>([]);

    // Sync local data when pinned stories change
    useEffect(() => {
        if (pinnedStories) {
            setLocalData(pinnedStories);
        }
    }, [pinnedStories]);

    const onRefresh = async () => {
        setIsFetching(true);
        await refetch();
        setIsFetching(false);
    };

    // Update sort order in DynamoDB after drag reorder
    const onDragEnd = async ({ data: reordered }: { data: any[] }) => {
        // Only the loaded pins are reordered, so hand the SAME set of sortOrder values back out in
        // the new order. Unloaded pins keep their values, so global order stays consistent.
        const orders = localData.map(i => i.sortOrder ?? 0).sort((a, b) => a - b);
        const next = reordered.map((item, index) => ({ ...item, sortOrder: orders[index] ?? index }));
        setLocalData(next);
        try {
            await Promise.all(
                next.map(async item =>
                    unwrap(await client.models.UserPinnedStory.update({
                        id: item.id,
                        sortOrder: item.sortOrder,
                    }), 'Reorder pins')
                )
            );
        } catch (e) {
            console.log('Error updating sort order:', e);
        }
    };

    // Draw straight from the loaded pins until a drag-to-reorder makes a local copy, so the list never lags a frame
    // behind the data (that gap was the empty-state flash).
    const listData = localData.length > 0 ? localData : (pinnedStories ?? []);

    const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<any>) => (
        <ScaleDecorator activeScale={1.02}>
            <PinnedStoryTile
                item={item}
                reorderEnabled={reorderEnabled}
                drag={drag}
                isActive={isActive}
                isFirst={getIndex?.() === 0}
            />
        </ScaleDecorator>
    );

    // The empty message is only for a list that finished loading and really has no pins. While the first load is
    // under way (or has not started) the person sees placeholder rows, never "Build your playlist".
    const ListEmpty = () => isPending ? <SkeletonRows count={6} /> : (
        <View style={styles.emptyContainer}>
            {isError ? (
                <EmptyState
                    icon={<Icon name="exclamation-circle" size={40} color={colors.textSecondary} />}
                    title="We couldn't load your playlist"
                    body="Check your connection and try again."
                    actionLabel="Try again"
                    onAction={() => { refetch(); }}
                />
            ) : (
                <EmptyState
                    icon={<Icon name="thumbtack" size={40} color={colors.textSecondary} />}
                    title="Build your playlist"
                    body="Tap the pin on any story to add it here. Pinned stories play one after another and are saved to your phone for offline listening."
                    actionLabel="Find a story"
                    onAction={() => navigate('SearchScreen')}
                />
            )}
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <DraggableFlatList
                data={listData}
                onDragEnd={onDragEnd}
                onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
                onEndReachedThreshold={1.5}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={onRefresh}
                        tintColor={colors.accent}
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
                ListEmptyComponent={<ListEmpty />}
                ListFooterComponent={
                    <View style={{ height: 100, paddingTop: 16 }}>
                        {isFetchingNextPage ? <ActivityIndicator color={colors.accent} accessibilityLabel="Loading more pinned stories" /> : null}
                    </View>
                }
                initialNumToRender={10}
                windowSize={7}
                maxToRenderPerBatch={10}
            />
        </View>
    );
};

const styles = StyleSheet.create({
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

export default StoryTileList;