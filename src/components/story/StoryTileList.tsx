import React, { useState } from 'react';
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
import StoryTile from './StoryTile';
import { useApp } from '@/context/AppContext';
import stories from '../../../dummydata/stories';

type StoryTileListProps = {
    reorderEnabled?: boolean;
    tabBarHeight?: number;
};

const StoryTileList = ({ reorderEnabled = false, tabBarHeight = 80 }: StoryTileListProps) => {

    const { userId } = useApp();

    const [data, setData]             = useState<any[]>(stories);
    const [isFetching, setIsFetching] = useState(false);
    const [isLoading, setIsLoading]   = useState(false);

    const onRefresh = () => {
        setIsFetching(true);
        setTimeout(() => setIsFetching(false), 1500);
    };

    const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => (
        <ScaleDecorator activeScale={1.02}>
            <StoryTile
                title={item.title}
                imageUri={item.imageUri}
                primaryTag={item.primaryTag}
                audioUri={item.audioUri}
                summary={item.summary}
                author={item.author}
                description={item.description}
                duration={item.duration}
                id={item.id}
                numListens={item.numListens}
                // Reorder props
                reorderEnabled={reorderEnabled}
                drag={reorderEnabled ? drag : undefined}
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
                    <Text style={styles.emptyText}>Nothing here yet.</Text>
                    <Text style={styles.emptyHint}>(pull to refresh)</Text>
                </>
            )}
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <DraggableFlatList
                data={data}
                onDragEnd={({ data: reordered }) => setData(reordered)}
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
    },
    emptyText: {
        color: '#fff',
        fontSize: 15,
        marginBottom: 8,
    },
    emptyHint: {
        color: '#ffffff50',
        fontSize: 13,
    },
});

export default StoryTileList;