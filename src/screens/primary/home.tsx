import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableWithoutFeedback, View, Dimensions, ActivityIndicator } from 'react-native';
import { Text } from '@/components/common/AppText';

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { getStatusBarHeight } from 'react-native-status-bar-height';

import useStyles from '../../theme/styles';
import useTypography from '../../theme/typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import Screen from '@/components/common/Screen';
import { useApp } from '@/context/AppContext';
import { useAuthors } from '../../hooks/queries/useAuthors';

import ForYouCarousel from '../../components/story/ForYouCarousel';
import HorizontalList from '../../components/story/HorizontalList';
import ContinueListening from '../../components/story/ContinueListening';

import { useStories } from '../../hooks/queries/useStories';
import { usePrimaryTags } from '../../hooks/queries/useTags';
import { useTagNames } from '../../hooks/queries/useTagNames';

const HomeScreen = ({ navigation }: any) => {

    const { userId } = useApp();
    const styles = useStyles();
    const typo = useTypography();

    const { data: authors } = useAuthors();

    const authorMap = React.useMemo(() => {
        if (!authors) return {};
        return authors.reduce((acc: Record<string, string>, author) => {
            if (author.id && author.name) acc[author.id] = author.name;
            return acc;
        }, {});
    }, [authors]);

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

    const allTagIds = React.useMemo(() => {
        if (!stories) return [];
        return stories.flatMap(s => [s.primaryTagId, s.secondaryTagId]);
    }, [stories]);

    const { data: tagMap } = useTagNames(allTagIds);

    const enrichedStories = React.useMemo(() => {
        if (!stories) return [];
        return stories
            .filter(story => !!story.id && story.isErotic !== 'true')  // ← add erotic filter
            .map(story => ({
                ...story,
                primaryTagName:   story.primaryTagId   ? tagMap[story.primaryTagId]   ?? '' : '',
                secondaryTagName: story.secondaryTagId ? tagMap[story.secondaryTagId] ?? '' : '',
                authorName:       story.authorId       ? authorMap[story.authorId]    ?? '' : '',
            }));
    }, [stories, tagMap, authorMap]);

    const topTags = React.useMemo(() => {
        if (!tags) return [];
        return tags.filter(t => !t.isErotic).slice(0, 4);  // ← add erotic filter
    }, [tags]);

    return (
        <Screen>
            <LinearGradient
                colors={['#0a0a14', '#12121a', '#000']}
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
                                <Ionicons name="person" size={20} color="#fff" />
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

                            {/* Continue Listening — shows up to 4 most recent in-progress stories */}
                            <View style={{ paddingVertical: 10 }}>
                                <ContinueListening />
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