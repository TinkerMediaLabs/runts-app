import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';

import Animated, {
    FadeInDown,
    FadeInUp,
    Layout,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import Screen from "@/components/common/Screen";
import dummytags from '../../../dummydata/dummytags';

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';
import { useApp } from '../../context/AppContext';

const client = generateClient<Schema>();

const SplashCarousel = ({ navigation, route }: any) => {

    const { refreshAuth } = useApp();
    const [genres] = useState(dummytags);
    const [top3, setTop3] = useState<string[]>([]);

    // -----------------------
    // SELECT GENRE
    // -----------------------
    const toggleGenre = (id: string) => {
        if (top3.includes(id)) {
            setTop3(prev => prev.filter(item => item !== id));
            return;
        }
        if (top3.length < 3) {
            setTop3(prev => [...prev, id]);
        }
    };

    // -----------------------
    // NEXT
    // -----------------------
    const UpdateThree = async () => {
        if (top3.length !== 3) {
            alert('Please select 3 genres');
            return;
        }

        try {
            const { userId } = await getCurrentUser();
            const birthdate = route?.params?.birthdate ?? null;

            await client.models.User.update({
                id: userId,
                name: 'user',       // marks them as no longer new
                birthdate: birthdate,
            });

            await refreshAuth();    // re-checks isNewUser → triggers navigation to Root

        } catch (e) {
            console.log(e);
        }
    };

    return (
        <Screen>
            <View style={styles.container}>

                {/* HEADER */}
                <Animated.View
                    entering={FadeInUp.duration(700)}
                    style={styles.headerContainer}
                >
                    <Text style={styles.title}>
                        Let's Get Started
                    </Text>

                    <Text style={styles.subtitle}>
                        Select your 3 favorite genres
                    </Text>

                    <Text style={styles.counter}>
                        {top3.length}/3 selected
                    </Text>
                </Animated.View>

                {/* GENRE GRID */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.genreContainer}
                >
                    {genres.map(({ name, id }, index) => {

                        const selected = top3.includes(id);

                        return (
                            <GenreChip
                                key={id}
                                genre={name}
                                selected={selected}
                                onPress={() => toggleGenre(id)}
                                delay={index * 50}
                            />
                        );
                    })}
                </ScrollView>

                {/* FOOTER */}
                <Animated.View
                    entering={FadeInDown.delay(400).duration(700)}
                    style={styles.footer}
                >
                    <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={top3.length !== 3}
                        onPress={UpdateThree}
                        style={[
                            styles.nextButton,
                            {
                                opacity: top3.length === 3 ? 1 : 0.4,
                            }
                        ]}
                    >
                        <Text style={styles.nextText}>
                            Continue
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

            </View>
        </Screen>
    );
};

// =======================================================
// GENRE CHIP
// =======================================================

const GenreChip = ({
    genre,
    selected,
    onPress,
    delay,
}: any) => {

    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            {
                scale: withSpring(scale.value, {
                    damping: 12,
                    stiffness: 180,
                }),
            },
        ],
    }));

    useEffect(() => {
        scale.value = selected ? 1.05 : 1;
    }, [selected]);

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).springify()}
            layout={Layout.springify()}
            style={[styles.chipWrapper, animatedStyle]}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPress}
                onPressIn={() => { scale.value = 0.96; }}
                onPressOut={() => { scale.value = selected ? 1.05 : 1; }}
                style={[
                    styles.chip,
                    selected && styles.chipSelected,
                ]}
            >
                <Text
                    style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                    ]}
                >
                    {genre}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

// =======================================================
// STYLES
// =======================================================

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#0B0B0D',
        paddingTop: 80,
    },

    headerContainer: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },

    title: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '700',
    },

    subtitle: {
        color: '#A1A1AA',
        fontSize: 16,
        marginTop: 10,
    },

    counter: {
        color: '#00D5D5',
        fontSize: 14,
        marginTop: 14,
        fontWeight: '600',
    },

    genreContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 14,
        paddingBottom: 40,
    },

    chipWrapper: {
        width: '50%',
        padding: 8,
    },

    chip: {
        borderWidth: 1,
        borderColor: '#2A2A2E',
        backgroundColor: '#151518',
        paddingVertical: 16,
        borderRadius: 18,
    },

    chipSelected: {
        backgroundColor: '#00D5D5',
        borderColor: '#00D5D5',
    },

    chipText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '600',
        textTransform: 'capitalize',
    },

    chipTextSelected: {
        color: '#000',
    },

    footer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 10,
    },

    nextButton: {
        backgroundColor: '#00D5D5',
        paddingVertical: 18,
        borderRadius: 18,
    },

    nextText: {
        textAlign: 'center',
        color: '#000',
        fontWeight: '700',
        fontSize: 16,
    },
});

export default SplashCarousel;