import React, { useState, useMemo } from 'react';
import { View, FlatList, Dimensions, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import ProgressTile from './ProgressTile';
import EmptyState from '../common/EmptyState';
import { SkeletonRows } from '../common/Skeleton';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useInProgressStoriesPaginated } from '../../hooks/queries/useInProgressStories';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';

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
                        tintColor={colors.accent}
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListFooterComponent={
                    <View style={{ height: 100, paddingTop: 16 }}>
                        {isFetchingNextPage ? <ActivityIndicator size="small" color={colors.accent} /> : null}
                    </View>
                }
                ListEmptyComponent={
                    isLoading ? <SkeletonRows count={6} /> : (
                        <EmptyState
                            icon={<FontAwesome5 name="headphones" size={40} color={colors.textSecondary} iconStyle="solid" />}
                            title="No stories in progress"
                            body="Start listening to a story and it will appear here."
                        />
                    )
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