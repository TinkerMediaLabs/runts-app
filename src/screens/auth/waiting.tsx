import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';

import Screen from '@/components/common/Screen';
import useStyles from '@/theme/styles';

const Waiting = () => {
    const styles = useStyles();

    const headphoneScale = useSharedValue(1);
    const headphoneGlow = useSharedValue(0.3);
    const eyeBlink = useSharedValue(1);
    const floatY = useSharedValue(0);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | undefined;

        const blinkLoop = () => {
            eyeBlink.value = withSequence(
                withTiming(0.05, { duration: 90 }),
                withTiming(1, { duration: 140 })
            );
            const next = 4000 + Math.random() * 2000;
            timeout = setTimeout(blinkLoop, next);
        };

        timeout = setTimeout(blinkLoop, 1500);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        headphoneScale.value = withRepeat(
            withSequence(
                withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1200 })
            ),
            -1,
            true
        );

        headphoneGlow.value = withRepeat(
            withSequence(
                withTiming(0.9, { duration: 1200 }),
                withTiming(0.25, { duration: 1200 })
            ),
            -1,
            true
        );

        floatY.value = withRepeat(
            withSequence(
                withTiming(-6, { duration: 1800 }),
                withTiming(0, { duration: 1800 })
            ),
            -1,
            true
        );
    }, []);

    const containerAnim = useAnimatedStyle(() => ({
        transform: [{ translateY: floatY.value }],
    }));

    const headphoneAnim = useAnimatedStyle(() => ({
        transform: [{ scale: headphoneScale.value }],
        opacity: headphoneGlow.value,
    }));

    const eyeAnim = useAnimatedStyle(() => ({
        transform: [{ scaleY: eyeBlink.value }],
    }));

    return (
        <Screen>
            <View
                style={[
                    styles.container,
                    {
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#000',
                    },
                ]}
            >
                <Animated.View style={[containerAnim, { alignItems: 'center' }]}>
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Animated.View
                            style={[
                                headphoneAnim,
                                {
                                    position: 'absolute',
                                    width: 16,
                                    height: 16,
                                    borderRadius: 80,
                                    backgroundColor: '#18d7ff',
                                    opacity: 0.25,
                                },
                            ]}
                        />

                        <Animated.Image
                            source={require('../../../assets/images/adaptive-icon.png')}
                            style={{
                                width: 180,
                                height: 180,
                                resizeMode: 'contain',
                            }}
                        />

                        <View style={{
                            backgroundColor: '#d0d0d0',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexDirection: 'row',
                            borderRadius: 100,
                            width: 40,
                            bottom: 80,
                        }}>
                            <Animated.View
                                style={[
                                    eyeAnim,
                                    {
                                        width: 14,
                                        height: 14,
                                        backgroundColor: '#000',
                                        borderRadius: 9,
                                    },
                                ]}
                            />
                            <Animated.View
                                style={[
                                    eyeAnim,
                                    {
                                        width: 14,
                                        height: 14,
                                        backgroundColor: '#000',
                                        borderRadius: 9,
                                    },
                                ]}
                            />
                        </View>
                    </View>

                    <Text style={{ color: '#ffffff55', marginTop: 24, fontSize: 13 }}>
                        loading
                    </Text>
                </Animated.View>

                <StatusBar style="light" />
            </View>
        </Screen>
    );
};

export default Waiting;