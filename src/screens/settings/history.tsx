import React, { useState, useMemo, useEffect } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import Screen from '@/components/common/Screen';
import { useApp } from '@/context/AppContext';
import MenuHeader from '../../components/common/MenuHeader';
import StoryTile from '../../components/story/StoryTile';
import { useStoryImage } from '../../hooks/queries/useStoryImage';
import { useFinishedStories } from '../../hooks/queries/useFinishedStories';
import { useAuthor } from '../../hooks/queries/useAuthors';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { spacing } from '../../theme/spacing';
import { useTag } from '../../hooks/queries/useTagNames';

const client = generateClient<Schema>();

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
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                <MenuHeader title="History" navigation={navigation} />

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color="cyan" />
                    </View>
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
                                tintColor="cyan"
                            />
                        }
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No listening history yet.</Text>
                                <Text style={styles.emptyHint}>
                                    Stories you finish will appear here.
                                </Text>
                            </View>
                        }
                        ListFooterComponent={
                            <View style={{ height: 100, paddingTop: 16 }}>
                                {isFetchingNextPage ? <ActivityIndicator color="cyan" /> : null}
                            </View>
                        }
                    />
                )}
            </View>
        </Screen>
    );
};

const styles = StyleSheet.create({
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
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    emptyHint: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default History;