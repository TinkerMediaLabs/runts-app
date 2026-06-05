import React, { useRef, useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
} from 'react-native';

import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    runOnJS,
} from 'react-native-reanimated';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import { spacing } from '@/theme/spacing';

import Screen        from '@/components/common/Screen';
import MenuHeader    from '@/components/common/MenuHeader';
import StoryTile     from '../../components/story/StoryTile';
import LetterBrowser, { LengthFilter } from '../../components/story/LetterBrowser';

import { useStories }    from '../../hooks/queries/useStories';
import { useAuthors }    from '../../hooks/queries/useAuthors';
import { useTags }       from '../../hooks/queries/useTags';
import { useStoryImage } from '../../hooks/queries/useStoryImage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCRUNCH_THRESHOLD = SCREEN_HEIGHT * 0.5;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<any>);

// ---------------------------------------------------------------------------
// Per-tile wrapper — resolves S3 image without blocking the list
// ---------------------------------------------------------------------------

const BrowseStoryItem = React.memo(({
    item,
    authorMap,
    tagMap,
}: {
    item:      any;
    authorMap: Record<string, string>;
    tagMap:    Record<string, string>;
}) => {
    const { data: resolvedImageUri } = useStoryImage(
        item?.imageUri?.startsWith('stories/') ? item.imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? item?.imageUri ?? '';

    return (
        <View style={{ marginBottom: spacing.margin }}>
            <StoryTile
                id={item.id}
                title={item.title}
                imageUri={displayImageUri}
                primaryTag={tagMap[item.primaryTagId ?? ''] ?? ''}
                audioUri={item.audioUri ?? ''}
                summary={item.summary ?? ''}
                description={item.description ?? ''}
                author={authorMap[item.authorId ?? ''] ?? ''}
                duration={item.duration ?? 0}
                numListens={item.numListens ?? 0}
            />
        </View>
    );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const BrowseByTitle = ({ navigation }: any) => {

    const flatListRef = useRef<FlatList>(null);

    // ── Scroll-driven compact state ───────────────────────────────────────────
    const scrollY = useSharedValue(0);
    const [compact, setCompact] = useState(false);

    const updateCompact = useCallback((value: boolean) => {
        setCompact(prev => (prev === value ? prev : value));
    }, []);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
            runOnJS(updateCompact)(event.contentOffset.y >= SCRUNCH_THRESHOLD);
        },
    });

    // ── Letter / filter state ─────────────────────────────────────────────────
    const [selectedLetter,     setSelectedLetter]     = useState('a');
    const [selectedIndex,      setSelectedIndex]      = useState(0);
    const [lengthFilter,       setLengthFilter]       = useState<LengthFilter>('Any Length');
    const [startingTime,       setStartingTime]       = useState(0);
    const [endingTime,         setEndingTime]         = useState(5400000);
    const [lengthModalVisible, setLengthModalVisible] = useState(false);

    // ── Real data ─────────────────────────────────────────────────────────────
    const {
        data:        allStories,
        isLoading:   storiesLoading,
        isRefetching,
        refetch,
    } = useStories();

    const { data: authors } = useAuthors();
    const { data: tags }    = useTags();

    const authorMap = useMemo(() => {
        if (!authors) return {};
        return authors.reduce((acc: Record<string, string>, a) => {
            if (a.id && a.name) acc[a.id] = a.name;
            return acc;
        }, {});
    }, [authors]);

    const tagMap = useMemo(() => {
        if (!tags) return {};
        return tags.reduce((acc: Record<string, string>, t) => {
            if (t.id && t.name) acc[t.id] = t.name;
            return acc;
        }, {});
    }, [tags]);

    // ── Filter stories by letter + duration ───────────────────────────────────
    // LetterBrowser expresses duration in milliseconds; Story.duration is in
    // seconds — multiply by 1000 before comparing.
    const filteredStories = useMemo(() => {
        if (!allStories) return [];
        return allStories.filter(story => {
            if (story.live !== 'true') return false;
            if (!story.title?.toLowerCase().startsWith(selectedLetter)) return false;
            const durationMs = (story.duration ?? 0) * 1000;
            if (durationMs < startingTime) return false;
            if (durationMs > endingTime)   return false;
            return true;
        });
    }, [allStories, selectedLetter, startingTime, endingTime]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleLetterSelect = (letter: string, index: number) => {
        setSelectedLetter(letter);
        setSelectedIndex(index);
        // Scroll back to top — also reverses the compact state naturally
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    };

    const handleLengthFilterChange = (
        label: LengthFilter,
        start: number,
        end:   number
    ) => {
        setLengthFilter(label);
        setStartingTime(start);
        setEndingTime(end);
        setLengthModalVisible(false);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Screen>
            <View style={{ flex: 1, backgroundColor: '#000' }}>

                <MenuHeader title="Browse by Title" navigation={navigation} />

                <View style={{ marginBottom: spacing.margin }}>
                    <LetterBrowser
                        selectedLetter={selectedLetter}
                        selectedIndex={selectedIndex}
                        onLetterSelect={handleLetterSelect}
                        lengthFilter={lengthFilter}
                        onLengthFilterChange={handleLengthFilterChange}
                        lengthModalVisible={lengthModalVisible}
                        onLengthModalOpen={() => setLengthModalVisible(true)}
                        onLengthModalClose={() => setLengthModalVisible(false)}
                        compact={compact}
                    />
                </View>

                <AnimatedFlatList
                    ref={flatListRef}
                    data={filteredStories}
                    renderItem={({ item }: any) => (
                        <BrowseStoryItem
                            item={item}
                            authorMap={authorMap}
                            tagMap={tagMap}
                        />
                    )}
                    keyExtractor={(item: any) => item.id}
                    showsVerticalScrollIndicator={false}
                    maxToRenderPerBatch={10}
                    initialNumToRender={10}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    contentContainerStyle={{
                        paddingHorizontal: spacing.margin,
                        paddingBottom:     200,
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor="cyan"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            {storiesLoading ? (
                                <ActivityIndicator size="small" color="cyan" />
                            ) : (
                                <>
                                    <FontAwesome5
                                        name={'book-open' as any}
                                        size={40}
                                        color="#ffffff40"
                                        iconStyle="solid"
                                    />
                                    <Text style={styles.emptyText}>
                                        No stories found for "{selectedLetter.toUpperCase()}"
                                    </Text>
                                </>
                            )}
                        </View>
                    }
                    ListFooterComponent={<View style={{ height: 120 }} />}
                />

            </View>
        </Screen>
    );
};

const styles = StyleSheet.create({
    emptyContainer: {
        alignItems: 'center',
        marginTop:  80,
    },
    emptyText: {
        color:     '#ffffffa5',
        marginTop: 16,
        fontSize:  16,
    },
});

export default BrowseByTitle;