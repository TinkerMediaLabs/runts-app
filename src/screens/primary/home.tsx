import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    TouchableWithoutFeedback,
    View,
    Text,
    Dimensions,
    ActivityIndicator,
} from 'react-native';

import { FontAwesome } from '@react-native-vector-icons/fontawesome';
import { LinearGradient } from 'expo-linear-gradient';
import { getStatusBarHeight } from 'react-native-status-bar-height';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import Screen from '@/components/common/Screen';
import { useApp } from '@/context/AppContext';

import ForYouCarousel from '../../components/story/ForYouCarousel';
import HorizontalList from '../../components/story/HorizontalList';
import ContinueListening from '../../components/story/ContinueListening';

import { useStories } from '../../hooks/queries/useStories';
import { usePrimaryTags } from '../../hooks/queries/useTags';

const HomeScreen = ({ navigation }: any) => {

    const { userId } = useApp();
    const styles = useStyles();
    const typo = useTypography();

    const { data: stories, isLoading: storiesLoading } = useStories();
    const { data: tags, isLoading: tagsLoading } = usePrimaryTags();

    const isLoading = storiesLoading || tagsLoading;

    const welcomeText = [
        "Discover a new world",
        "Relax. Have a listen",
        "Greetings, Traveler",
        "Enjoy your storytime",
        "Jump into the rabbit hole",
        "Let the story begin",
        "Find your next escape",
        "Drift into a new tale",
        "Step beyond the page",
        "Step 1: Press play.",
        "Leave here for a while",
    ];

    const [text, setText] = useState('');

    useEffect(() => {
        const getRandomInt = (max: number) => Math.floor(Math.random() * max);
        setText(welcomeText[getRandomInt(welcomeText.length)]);
    }, []);

    // Build a tag lookup map: { [tagId]: tagName }
    const tagMap = React.useMemo(() => {
        if (!tags) return {};
        return tags.reduce((acc: Record<string, string>, tag) => {
            if (tag.id && tag.name) acc[tag.id] = tag.name;
            return acc;
        }, {});
    }, [tags]);

    // Enrich stories with resolved tag names
    const enrichedStories = React.useMemo(() => {
        if (!stories) return [];
        return stories.map(story => ({
            ...story,
            primaryTagName: story.primaryTagId ? tagMap[story.primaryTagId] ?? '' : '',
            secondaryTagName: story.secondaryTagId ? tagMap[story.secondaryTagId] ?? '' : '',
        }));
    }, [stories, tagMap]);

    // Get top 3 primary tags for horizontal lists
    const topTags = React.useMemo(() => {
        if (!tags) return [];
        return tags.slice(0, 4);
    }, [tags]);

    return (
        <Screen>
            <LinearGradient
                colors={['#13192Ca5', '#161b1b', '#000000']}
                style={{ flex: 1, minHeight: Dimensions.get('window').height }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1 }}
                >
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: getStatusBarHeight() + 20,
                        marginBottom: 10,
                        marginHorizontal: spacing.margin,
                    }}>
                        <Text style={[{ color: colors.text }, typo.h1]}>
                            {text}
                        </Text>
                        <TouchableWithoutFeedback onPress={() => navigation.navigate('UserScreen')}>
                            <View style={{ paddingLeft: 30, justifyContent: 'center' }}>
                                <FontAwesome name="user" size={20} color="#fff" />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>

                    {isLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
                            <ActivityIndicator color="cyan" />
                        </View>
                    ) : (
                        <>
                            {/* Featured carousel */}
                            <View>
                                <ForYouCarousel
                                    stories={enrichedStories}
                                    tagMap={tagMap}
                                />
                            </View>

                            {/* Horizontal lists by tag */}
                            {topTags.map(tag => {
                                const tagStories = enrichedStories.filter(
                                    s => s.primaryTagId === tag.id
                                );
                                if (tagStories.length === 0) return null;
                                return (
                                    <View key={tag.id}>
                                        <View style={{ marginLeft: spacing.margin, paddingVertical: spacing.margin }}>
                                            <Text style={typo.title}>{tag.name}</Text>
                                        </View>
                                        <HorizontalList
                                            stories={tagStories}
                                            tagId={tag.id}
                                            tagName={tag.name ?? ''}
                                        />
                                    </View>
                                );
                            })}
                        </>
                    )}

                    <View style={{ height: 300 }} />
                </ScrollView>
            </LinearGradient>
        </Screen>
    );
};

export default HomeScreen;