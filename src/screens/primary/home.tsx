import React, { useCallback, useEffect, useState } from 'react';
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

import HomeSectionView from '../../components/home/HomeSectionView';
import { useHomeLayout } from '../../hooks/queries/useHomeLayout';

const HomeScreen = ({ navigation }: any) => {

        const styles = useStyles();
    const typo = useTypography();



    const { sections, isLoading } = useHomeLayout();

    // Sections appear strictly top to bottom: one is shown once every section above it has settled.
    const [settled, setSettled] = useState<Record<string, true>>({});
    const markSettled = useCallback((id: string) => setSettled(s => (s[id] ? s : { ...s, [id]: true })), []);
    const firstUnsettled = sections.findIndex(s => !settled[s.id]);
    const lastVisible = firstUnsettled === -1 ? sections.length : firstUnsettled;

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
                            {sections.map((section, i) => (
                                <HomeSectionView key={section.id} section={section} index={i} visible={i <= lastVisible} onSettled={markSettled} />
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