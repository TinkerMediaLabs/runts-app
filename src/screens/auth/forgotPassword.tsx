//screen to begin the reset password process by entering the email address associated with the account

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Dimensions,
    TextInput,
    TouchableOpacity,
    Keyboard,
    TouchableWithoutFeedback,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';

import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
} from 'react-native-reanimated';

import useStyles from '../../theme/authStyles';

import { LinearGradient } from 'expo-linear-gradient';

import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const ForgotPassword = ({ navigation }: any) => {
    const styles = useStyles();

    const [email, setEmail] = useState('');

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');

    // animations
    const contentOpacity = useSharedValue(0);
    const contentTranslateY = useSharedValue(30);
    const buttonScale = useSharedValue(1);

    useEffect(() => {
        contentOpacity.value = withTiming(1, {
            duration: 700,
        });

        contentTranslateY.value = withSpring(0, {
            damping: 14,
            stiffness: 120,
        });
    }, []);

    const animatedContainerStyle = useAnimatedStyle(() => {
        return {
            opacity: contentOpacity.value,
            transform: [
                {
                    translateY: contentTranslateY.value,
                },
            ],
        };
    });

    const buttonAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: buttonScale.value,
                },
            ],
        };
    });

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }

        setLoading(true);

        setError('');

        buttonScale.value = withSequence(
            withTiming(0.96, {
                duration: 100,
            }),
            withSpring(1)
        );

        try {
            await Auth.forgotPassword(
                email.replace(/ /g, '')
            );

            navigation.navigate('ForgotPasswordCon', {
                email: email.replace(/ /g, ''),
            });
        } catch (err: any) {
            console.log(err);

            setError(
                err?.message ||
                    'Error sending reset code. Please try again.'
            );
        }

        setLoading(false);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <LinearGradient
                colors={['#000000', '#050505', '#0a0a0a']}
                style={{
                    flex: 1,
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <KeyboardAvoidingView
                    behavior={
                        Platform.OS === 'ios'
                            ? 'padding'
                            : undefined
                    }
                    style={{
                        flex: 1,
                    }}
                >
                    <View
                        style={[
                            styles.container,
                            {
                                justifyContent: 'center',
                                minHeight: height,
                                backgroundColor: 'transparent',
                            },
                        ]}
                    >
                        <Animated.View
                            style={[
                                {
                                    paddingHorizontal: 24,
                                },
                                animatedContainerStyle,
                            ]}
                        >
                            {/* Header */}
                            <Animated.View
                                entering={FadeInDown.duration(700)}
                            >
                                <Text
                                    style={[
                                        styles.title,
                                        {
                                            fontSize: 34,
                                            marginBottom: 12,
                                        },
                                    ]}
                                >
                                    Reset Password
                                </Text>

                                <Text
                                    style={[
                                        styles.paragraph,
                                        {
                                            color: '#ffffff88',
                                            lineHeight: 22,
                                            marginBottom: 40,
                                        },
                                    ]}
                                >
                                    Enter the email associated with
                                    your account and we'll send you a
                                    reset code.
                                </Text>
                            </Animated.View>

                            {/* Error */}
                            {error ? (
                                <Animated.View
                                    entering={FadeIn.duration(250)}
                                    style={{
                                        backgroundColor:
                                            '#ff444415',
                                        borderWidth: 1,
                                        borderColor:
                                            '#ff444440',
                                        borderRadius: 18,
                                        padding: 14,
                                        marginBottom: 24,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: '#ff8a8a',
                                            fontSize: 13,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {error}
                                    </Text>
                                </Animated.View>
                            ) : null}

                            {/* Input */}
                            <Animated.View
                                entering={FadeInUp.delay(
                                    150
                                ).duration(700)}
                            >
                                <Text
                                    style={[
                                        styles.title,
                                        {
                                            marginBottom: 8,
                                            marginHorizontal: 0,
                                            fontSize: 14,
                                        },
                                    ]}
                                >
                                    Email
                                </Text>

                                <View
                                    style={[
                                        styles.inputfield,
                                        {
                                            //height: 56,
                                            borderRadius: 18,
                                            backgroundColor:
                                                '#1a1a1a',
                                            //borderWidth: 1,
                                            borderColor:
                                                '#ffffff10',
                                            justifyContent:
                                                'center',
                                            marginBottom: 32,
                                        },
                                    ]}
                                >
                                    <TextInput
                                        placeholder="Enter your email"
                                        placeholderTextColor="#ffffff55"
                                        style={[
                                            styles.textInputTitle,
                                            {
                                                fontSize: 16,
                                                color: '#fff',
                                            },
                                        ]}
                                        maxLength={40}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        selectionColor="#00ffff"
                                        cursorColor="#00ffff"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>
                            </Animated.View>

                            {/* Button */}
                            {loading ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#00ffff"
                                />
                            ) : (
                                <Animated.View
                                    entering={FadeInUp.delay(
                                        300
                                    ).duration(700)}
                                    style={
                                        buttonAnimatedStyle
                                    }
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={
                                            handleForgotPassword
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.buttonlayout,
                                                {
                                                    alignSelf:
                                                        'center',
                                                    width:
                                                        width *
                                                        0.86,
                                                    borderRadius: 22,
                                                    //paddingVertical: 16,
                                                    backgroundColor:
                                                        '#00ffff',
                                                    shadowColor:
                                                        '#00ffff',
                                                    shadowOpacity: 0.3,
                                                    shadowRadius: 18,
                                                    //elevation: 10,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.buttontext,
                                                    {
                                                        width:
                                                            '100%',
                                                        fontSize: 16,
                                                        fontWeight:
                                                            '700',
                                                    },
                                                ]}
                                            >
                                                Send Reset Code
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}

                            {/* Back */}
                            <Animated.View
                                entering={FadeIn.delay(
                                    500
                                ).duration(900)}
                            >
                                <TouchableOpacity
                                    onPress={() =>
                                        navigation.goBack()
                                    }
                                >
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: '#ffffff66',
                                            alignSelf:
                                                'center',
                                            marginTop: 32,
                                        }}
                                    >
                                        Go Back
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </Animated.View>

                        <StatusBar
                            style="light"
                            backgroundColor="transparent"
                        />
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient>
        </TouchableWithoutFeedback>
    );
};

export default ForgotPassword;