import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    Dimensions,
    RefreshControl,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';

import ProgressTile from './ProgressTile';
import { useInProgressStories } from '../../hooks/queries/useInProgressStories';
import { useTags } from '../../hooks/queries/useTags';
import { useAuthors } from '../../hooks/queries/useAuthors';

const StoryTileList = () => {

    const { data: inProgressStories, isLoading, refetch } = useInProgressStories();
    const { data: tags }    = useTags();
    const { data: authors } = useAuthors();
    const [isFetching, setIsFetching] = useState(false);

    const tagMap = useMemo(() => {
        if (!tags) return {};
        return tags.reduce((acc: Record<string, string>, tag) => {
            if (tag.id && tag.name) acc[tag.id] = tag.name;
            return acc;
        }, {});
    }, [tags]);

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

    const renderItem = ({ item }: any) => (
        <ProgressTile
            inProgressRecord={item}
            tagMap={tagMap}
            authorMap={authorMap}
        />
    );

    return (
        <View style={{ width: Dimensions.get('window').width, flex: 1 }}>
            <FlatList
                data={inProgressStories ?? []}
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
                ListFooterComponent={<View style={{ height: 100 }} />}
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