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
import Reveal from '../../components/common/Reveal';
import { useApp } from '@/context/AppContext';

import ForYouCarousel from '../../components/story/ForYouCarousel';
import TagRow from '../../components/story/TagRow';
import ContinueListening from '../../components/story/ContinueListening';
import BecauseYouFinished from '../../components/story/BecauseYouFinished';

import { useForYouStories } from '../../hooks/queries/useForYouStories';
import { useEnrichedStories } from '../../hooks/queries/useEnrichedStories';
import { usePrimaryTags } from '../../hooks/queries/useTags';

const HomeScreen = ({ navigation }: any) => {

        const styles = useStyles();
    const typo = useTypography();



    const { profile } = useApp();
    const preferredTagIds = React.useMemo(() => profile?.preferredTagIds ?? [], [profile?.preferredTagIds]);
    const { data: forYou, isLoading: storiesLoading } = useForYouStories(preferredTagIds);
    const { data: tags, isLoading: tagsLoading } = usePrimaryTags();
    const { stories: enrichedStories, tagMap } = useEnrichedStories(forYou);

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

    const topTags = React.useMemo(() => {
        if (!tags) return [];
        const usable = tags.filter(t => !t.isErotic);
        const mine = preferredTagIds.map(id => usable.find(t => t.id === id)).filter(Boolean) as typeof usable;
        const rest = usable.filter(t => !preferredTagIds.includes(t.id));
        return [...mine, ...rest].slice(0, 4);
    }, [tags, preferredTagIds]);

    return (
        <Screen>
            <LinearGradient
                colors={['#000', '#0f1112', '#000']}
                style={{ flex: 1, minHeight: Dimensions.get('window').height }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1 }}
                >
                    {/* Header */}
                    <Reveal index={0}>
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
                        <TouchableWithoutFeedback hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} onPress={() => navigation.navigate('UserScreen')} accessibilityRole="button" accessibilityLabel="Your account">
                            <View style={{ paddingLeft: 30, justifyContent: 'center' }}>
                                <Ionicons name="person" size={20} color="#fff" />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                    </Reveal>

                    {isLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
                            <ActivityIndicator color="cyan" />
                        </View>
                    ) : (
                        <>
                            {/* Featured carousel */}
                            <Reveal index={1}>
                                <ForYouCarousel
                                    stories={enrichedStories}
                                    tagMap={tagMap}
                                />
                            </Reveal>

                            {/* Continue Listening — shows up to 4 most recent in-progress stories */}
                            <Reveal index={2} style={{ paddingVertical: 10 }}>
                                <ContinueListening />
                            </Reveal>

                            {/* Because you finished X — suggestions seeded by the last finished story */}
                            <Reveal index={3}>
                                <BecauseYouFinished />
                            </Reveal>

                            {/* Horizontal lists by tag */}
                            {topTags.map((tag, tagIndex) => (
                                <TagRow key={tag.id} tag={tag} index={3 + tagIndex} />
                            ))}
                        </>
                    )}

                    <View style={{ height: 300 }} />
                </ScrollView>
            </LinearGradient>
        </Screen>
    );
};

export default HomeScreen;