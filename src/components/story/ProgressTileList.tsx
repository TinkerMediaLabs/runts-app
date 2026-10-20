import React, { useState, useMemo } from 'react';
import { View, FlatList, Dimensions, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import ProgressTile from './ProgressTile';
import { useInProgressStoriesPaginated } from '../../hooks/queries/useInProgressStories';

const StoryTileList = () => {

    const { data: pages, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInProgressStoriesPaginated();
    const inProgressStories = useMemo(() => pages?.pages.flatMap(p => p.items) ?? [], [pages]);
    const [isFetching, setIsFetching] = useState(false);

    const onRefresh = async () => {
        setIsFetching(true);
        await refetch();
        setIsFetching(false);
    };

    const renderItem = ({ item }: any) => (
        <ProgressTile
            inProgressRecord={item}
        />
    );

    return (
        <View style={{ width: Dimensions.get('window').width, flex: 1 }}>
            <FlatList
                data={inProgressStories}
                onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
                onEndReachedThreshold={0.5}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                maxToRenderPerBatch={20}
                initialNumToRender={20}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={onRefresh}
                        tintColor="cyan"
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListFooterComponent={
                    <View style={{ height: 100, paddingTop: 16 }}>
                        {isFetchingNextPage ? <ActivityIndicator size="small" color="cyan" /> : null}
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {isLoading ? (
                            <ActivityIndicator size="small" color="cyan" />
                        ) : (
                            <>
                                <Text style={styles.emptyText}>
                                    No stories in progress.
                                </Text>
                                <Text style={styles.emptyHint}>
                                    Start listening to a story and it will appear here.
                                </Text>
                            </>
                        )}
                    </View>
                }
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