import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import useStyles from '@/theme/styles';
import { spacing } from '@/theme/spacing';
import { useApp } from '@/context/AppContext';

import Screen from '@/components/common/Screen';
import MenuHeader from '@/components/common/MenuHeader';
import StoryTile from '../../components/story/StoryTile';
import LetterBrowser, { LengthFilter, ALPHABET } from '../../components/story/LetterBrowser';

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Mock data — replace with your API
// ---------------------------------------------------------------------------

const ALL_STORIES = [
    { id: '1', title: 'Ashes of Avalon',  imageUri: '', primaryTag: 'Fantasy',   audioUri: '', summary: 'A knight searches for a forgotten kingdom.',          author: 'Sarah Vale',    time: 1200000, numListens: 1023 },
    { id: '2', title: 'Broken Signals',   imageUri: '', primaryTag: 'Cyberpunk', audioUri: '', summary: 'A rogue AI begins speaking through radio towers.',    author: 'Marcus Reed',   time: 2400000, numListens: 842  },
    { id: '3', title: 'Crimson Hollow',   imageUri: '', primaryTag: 'Horror',    audioUri: '', summary: 'A town disappears every midnight.',                   author: 'Emily Frost',   time: 600000,  numListens: 1500 },
    { id: '4', title: 'Dreamwalker',      imageUri: '', primaryTag: 'Fantasy',   audioUri: '', summary: 'A traveler enters the dreams of strangers.',          author: 'John Ray',      time: 3600000, numListens: 620  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BrowseByTitle = ({ name, id, navigation }: any) => {

    const { userId } = useApp();
    const appStyles = useStyles();

    const flatListRef = useRef<FlatList>(null);

    // ── Letter / filter state (owned here, passed down to LetterBrowser) ──────
    const [selectedLetter, setSelectedLetter]           = useState('a');
    const [selectedIndex, setSelectedIndex]             = useState(0);
    const [lengthFilter, setLengthFilter]               = useState<LengthFilter>('Any Length');
    const [startingTime, setStartingTime]               = useState(0);
    const [endingTime, setEndingTime]                   = useState(5400000);
    const [lengthModalVisible, setLengthModalVisible]   = useState(false);

    // ── List state ────────────────────────────────────────────────────────────
    const [genreStories, setGenreStories]   = useState<any[]>([]);
    const [isFetching, setIsFetching]       = useState(false);
    const [isLoading, setIsLoading]         = useState(false);

    // ── Handlers passed to LetterBrowser ─────────────────────────────────────
    const handleLetterSelect = (letter: string, index: number) => {
        setSelectedLetter(letter);
        setSelectedIndex(index);
        // Scroll the story list back to the top on letter change
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    };

    const handleLengthFilterChange = (label: LengthFilter, start: number, end: number) => {
        setLengthFilter(label);
        setStartingTime(start);
        setEndingTime(end);
        setLengthModalVisible(false);
    };

    // ── Filter stories whenever letter or time range changes ─────────────────
    useEffect(() => {
        setIsLoading(true);

        const filtered = ALL_STORIES.filter((story) =>
            story.title.toLowerCase().startsWith(selectedLetter) &&
            story.time >= startingTime &&
            story.time <= endingTime
        );

        // Simulate async — replace this block with your real API call
        const t = setTimeout(() => {
            setGenreStories(filtered);
            setIsLoading(false);
        }, 300);

        return () => clearTimeout(t);
    }, [selectedLetter, startingTime, endingTime]);

    // ── Pull-to-refresh ───────────────────────────────────────────────────────
    const onRefresh = () => {
        setIsFetching(true);
        setTimeout(() => setIsFetching(false), 800);
    };

    // ── Render story row ──────────────────────────────────────────────────────
    const renderItem = ({ item }: any) => (
        <View style={{ marginBottom: spacing.margin }}>
            <StoryTile
                title={item.title}
                imageUri={item.imageUri}
                primaryTag={item.primaryTag}
                audioUri={item.audioUri}
                summary={item.summary}
                author={item.author}
                time={item.time}
                id={item.id}
                numListens={item.numListens}
            />
        </View>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Screen>
            <View style={{ flex: 1, backgroundColor: '#000' }}>

                <MenuHeader title="Browse by Title" navigation={navigation} />

                {/* LetterBrowser is fully controlled — all state lives here */}
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
                    />
                </View>

                <FlatList
                    ref={flatListRef}
                    data={genreStories}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    maxToRenderPerBatch={10}
                    initialNumToRender={10}
                    contentContainerStyle={{
                        paddingHorizontal: spacing.margin,
                        paddingBottom: 200,
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isFetching}
                            onRefresh={onRefresh}
                            tintColor="cyan"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            {isLoading ? (
                                <ActivityIndicator size="small" color="cyan" />
                            ) : (
                                <>
                                    <FontAwesome5
                                        name="book-open"
                                        size={40}
                                        color="#ffffff40"
                                        iconStyle="solid"
                                    />
                                    <Text style={styles.emptyText}>No stories found.</Text>
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
        marginTop: 80,
    },
    emptyText: {
        color: '#ffffffa5',
        marginTop: 16,
        fontSize: 16,
    },
});

export default BrowseByTitle;