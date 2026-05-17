import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
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

const { width } = Dimensions.get('window');

const Waiting = ({navigation} : any) => {
    const styles = useStyles();

    const isLoading = true;
    const tryAgain = false;

    // ─────────────────────────────
    // ANIMATION VALUES
    // ─────────────────────────────

    // headphones pulse
    const headphoneScale = useSharedValue(1);
    const headphoneGlow = useSharedValue(0.3);

    // blink eyes (simple mask illusion)
    const eyeBlink = useSharedValue(1);

    // subtle float
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
        // headphone breathing pulse
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

        // floating motion
        floatY.value = withRepeat(
            withSequence(
                withTiming(-6, { duration: 1800 }),
                withTiming(0, { duration: 1800 })
            ),
            -1,
            true
        );

        // blinking loop (natural randomness)
        const blinkLoop = () => {
            eyeBlink.value = withSequence(
                withTiming(0.05, { duration: 90 }),
                withTiming(1, { duration: 140 })
            );

            const next = 3000 + Math.random() * 5000;
            setTimeout(blinkLoop, next);
        };

        setTimeout(blinkLoop, 1500);
    }, []);

      useEffect(() => {
    // 1. Start a timer for 10,000 milliseconds (10 seconds)
    const timeoutId = setTimeout(() => {
      navigation.navigate('Welcome'); // 2. Perform navigation
    }, 3000);

    // 3. Cleanup: Clear the timer if the component unmounts
    return () => clearTimeout(timeoutId);
  }, []);
    

    // ─────────────────────────────
    // ANIMATED STYLES
    // ─────────────────────────────

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
                {/* ─────────────────────────────
                    LOADING STATE
                ───────────────────────────── */}
                {isLoading ? (
                    <Animated.View style={[containerAnim, { alignItems: 'center' }]}>
                        {/* LOGO STACK */}
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            
                            {/* HEADPHONES GLOW (behind image) */}
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

                            {/* MAIN LOGO */}
                            <Animated.Image
                                source={require('../../../assets/images/adaptive-icon.png')}
                                style={{
                                    width: 180,
                                    height: 180,
                                    resizeMode: 'contain',
                                }}
                            />

                            {/* EYES LAYER (simple blink overlay illusion) */}
                            <View style={{
                                backgroundColor: '#d0d0d0' , 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                flexDirection: 'row',
                                borderRadius: 100,
                                width: 40,
                                bottom: 80
                            }}
                                >
                                <Animated.View
                                style={[
                                    eyeAnim,
                                    {
                                        //position: 'absolute',
                                        width: 14,
                                        height: 14,
                                        backgroundColor: '#000',
                                        borderRadius: 9,
                                        // top: 99,
                                        // left: 72,
                                    },
                                ]}
                            />

                            <Animated.View
                                style={[
                                    eyeAnim,
                                    {
                                        //position: 'absolute',
                                        width: 14,
                                        height: 14,
                                        backgroundColor: '#000',
                                        borderRadius: 9,
                                        //top: 99,
                                        //right: 72,
                                    },
                                ]}
                            />
                            </View>
                            
                        </View>

                        {/* optional subtle loader text (minimal) */}
                        <Text
                            style={{
                                color: '#ffffff55',
                                marginTop: 24,
                                fontSize: 13,
                            }}
                        >
                            loading
                        </Text>
                    </Animated.View>
                ) : (
                    // ─────────────────────────────
                    // ERROR STATE
                    // ─────────────────────────────
                    <View style={{ alignItems: 'center', padding: 30 }}>
                        <Text style={{ color: '#fff', textAlign: 'center' }}>
                            Error logging in. Please check your internet connection.
                        </Text>

                        <TouchableOpacity onPress={() => {}}>
                            <View style={{ marginTop: 20 }}>
                                <Text style={{ color: '#18d7ff' }}>
                                    Try Again
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                <StatusBar style="light" />
            </View>
        </Screen>
    );
};

export default Waiting;