import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    RefreshControl,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';

import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

import StoryTile from './StoryTile';
import { useApp } from '@/context/AppContext';
import { usePinnedStories } from '../../hooks/queries/usePinnedStories';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useTags } from '../../hooks/queries/useTags';
import { useAuthors } from '../../hooks/queries/useAuthors';

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
    tagMap,
    authorMap,
    reorderEnabled,
    drag,
    isActive,
}: {
    item: any;
    tagMap: Record<string, string>;
    authorMap: Record<string, string>;
    reorderEnabled: boolean;
    drag?: () => void;
    isActive?: boolean;
}) => {
    const [story, setStory] = useState<any>(null);

    useEffect(() => {
        async function fetchStory() {
            try {
                const { data } = await client.models.Story.get({ id: item.storyId });
                setStory(data);
            } catch (e) {
                console.log('Error fetching pinned story:', e);
            }
        }
        fetchStory();
    }, [item.storyId]);

    const { data: resolvedImageUri } = useStoryImage(
        story?.imageUri?.startsWith('stories/') ? story.imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? story?.imageUri ?? '';

    if (!story) return null;

    return (
        <StoryTile
            title={story.title}
            imageUri={displayImageUri}
            primaryTag={tagMap[story.primaryTagId ?? ''] ?? ''}
            audioUri={story.audioUri ?? ''}
            summary={story.summary ?? ''}
            author={authorMap[story.authorId ?? ''] ?? ''}
            description={story.description ?? ''}
            duration={story.duration ?? 0}
            id={story.id}
            numListens={story.numListens ?? 0}
            reorderEnabled={reorderEnabled}
            drag={reorderEnabled ? drag : undefined}
            isActive={isActive}
        />
    );
};

// ---------------------------------------------------------------------------
// Main list
// ---------------------------------------------------------------------------

const StoryTileList = ({ reorderEnabled = false, tabBarHeight = 80 }: StoryTileListProps) => {

    const { userId } = useApp();

    const { data: pinnedStories, isLoading, refetch } = usePinnedStories();
    const { data: tags }    = useTags();
    const { data: authors } = useAuthors();

    const [isFetching, setIsFetching] = useState(false);
    const [localData, setLocalData]   = useState<any[]>([]);

    // Sync local data when pinned stories change
    useEffect(() => {
        if (pinnedStories) {
            setLocalData(pinnedStories);
        }
    }, [pinnedStories]);

    // Build tag lookup map
    const tagMap = useMemo(() => {
        if (!tags) return {};
        return tags.reduce((acc: Record<string, string>, tag) => {
            if (tag.id && tag.name) acc[tag.id] = tag.name;
            return acc;
        }, {});
    }, [tags]);

    // Build author lookup map
    const authorMap = useMemo(() => {
        if (!authors) return {};
        return authors.reduce((acc: Record<string, string>, author) => {
            if (author.id && author.name) acc[author.id] = author.name;
            return acc;
        }, {});
    }, [authors]);

    const onRefresh = async () => {
        setIsFetching(true);
        await refetch();
        setIsFetching(false);
    };

    // Update sort order in DynamoDB after drag reorder
    const onDragEnd = async ({ data: reordered }: { data: any[] }) => {
        setLocalData(reordered);
        // Update sortOrder for each item
        try {
            await Promise.all(
                reordered.map((item, index) =>
                    client.models.UserPinnedStory.update({
                        id: item.id,
                        sortOrder: index,
                    })
                )
            );
        } catch (e) {
            console.log('Error updating sort order:', e);
        }
    };

    const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => (
        <ScaleDecorator activeScale={1.02}>
            <PinnedStoryTile
                item={item}
                tagMap={tagMap}
                authorMap={authorMap}
                reorderEnabled={reorderEnabled}
                drag={drag}
                isActive={isActive}
            />
        </ScaleDecorator>
    );

    const ListEmpty = () => (
        <View style={styles.emptyContainer}>
            {isLoading ? (
                <ActivityIndicator size="small" color="cyan" />
            ) : (
                <>
                    <Text style={styles.emptyText}>No pinned stories yet.</Text>
                    <Text style={styles.emptyHint}>
                        Tap the pin icon on any story to add it here.
                    </Text>
                </>
            )}
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <DraggableFlatList
                data={localData}
                onDragEnd={onDragEnd}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={onRefresh}
                        tintColor="cyan"
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
                ListEmptyComponent={<ListEmpty />}
                ListFooterComponent={<View style={{ height: 100 }} />}
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
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    emptyHint: {
        color: '#ffffff50',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default StoryTileList;