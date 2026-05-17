//confirmation screen for when a user has successfully reset their password

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
    ScrollView,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import Feather from '@react-native-vector-icons/feather';

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

import { StatusBar } from 'expo-status-bar';

import useStyles from '../../theme/authStyles';

const { width, height } = Dimensions.get('window');

const ForgotPassword = ({
    navigation,
    route,
}: {
    navigation: any;
    route: any;
}) => {
    const styles = useStyles();

    const { email } = route.params;

    const [newPassVis, setNewPassVis] =
        useState(false);

    const [conPassVis, setConPassVis] =
        useState(false);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');

    const [updatePass, setUpdatePass] = useState({
        username: email,
        code: '',
        password: '',
        confirmPass: '',
    });

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

    const animatedContainerStyle =
        useAnimatedStyle(() => {
            return {
                opacity: contentOpacity.value,
                transform: [
                    {
                        translateY:
                            contentTranslateY.value,
                    },
                ],
            };
        });

    const buttonAnimatedStyle =
        useAnimatedStyle(() => {
            return {
                transform: [
                    {
                        scale: buttonScale.value,
                    },
                ],
            };
        });

    const handleResetPassword = async () => {
        const {
            username,
            code,
            password,
            confirmPass,
        } = updatePass;

        setError('');

        if (!code.trim()) {
            setError(
                'Please enter the confirmation code.'
            );

            return;
        }

        if (password.length < 6) {
            setError(
                'Password must be at least 6 characters.'
            );

            return;
        }

        if (password !== confirmPass) {
            setError('Passwords do not match.');

            return;
        }

        buttonScale.value = withSequence(
            withTiming(0.96, {
                duration: 100,
            }),
            withSpring(1)
        );

        setLoading(true);

        try {
            const result =
                await Auth.forgotPasswordSubmit(
                    username,
                    code,
                    password
                );

            console.log(result);

            if (result) {
                navigation.navigate('SignIn');
            }
        } catch (e: any) {
            console.log(e);

            setError(
                e?.message ||
                    'Unable to reset password.'
            );
        }

        setLoading(false);
    };

    return (
        <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
        >
            <LinearGradient
                colors={[
                    '#000000',
                    '#050505',
                    '#0a0a0a',
                ]}
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
                    <ScrollView
                        showsVerticalScrollIndicator={
                            false
                        }
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{
                            minHeight: height,
                            justifyContent: 'center',
                            paddingVertical: 40,
                        }}
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
                                entering={FadeInDown.duration(
                                    700
                                )}
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
                                    Create New Password
                                </Text>

                                <Text
                                    style={[
                                        styles.paragraph,
                                        {
                                            color:
                                                '#ffffff88',
                                            lineHeight: 22,
                                            marginBottom: 40,
                                        },
                                    ]}
                                >
                                    Enter the confirmation
                                    code sent to your email
                                    and choose a new
                                    password.
                                </Text>
                            </Animated.View>

                            {/* Error */}
                            {error ? (
                                <Animated.View
                                    entering={FadeIn.duration(
                                        250
                                    )}
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
                                            color:
                                                '#ff8a8a',
                                            fontSize: 13,
                                            textAlign:
                                                'center',
                                        }}
                                    >
                                        {error}
                                    </Text>
                                </Animated.View>
                            ) : null}

                            {/* Confirmation Code */}
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
                                    Confirmation Code
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
                                            marginBottom: 24,
                                        },
                                    ]}
                                >
                                    <TextInput
                                        placeholder="Check email for code"
                                        placeholderTextColor="#ffffff55"
                                        style={[
                                            styles.textInputTitle,
                                            {
                                                fontSize: 16,
                                                color: '#fff',
                                            },
                                        ]}
                                        maxLength={40}
                                        autoCapitalize="none"
                                        keyboardType="number-pad"
                                        selectionColor="#00ffff"
                                        cursorColor="#00ffff"
                                        value={
                                            updatePass.code
                                        }
                                        onChangeText={(
                                            val
                                        ) =>
                                            setUpdatePass(
                                                {
                                                    ...updatePass,
                                                    code: val,
                                                }
                                            )
                                        }
                                    />
                                </View>
                            </Animated.View>

                            {/* New Password */}
                            <Animated.View
                                entering={FadeInUp.delay(
                                    250
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
                                    New Password
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
                                            flexDirection:
                                                'row',
                                            alignItems:
                                                'center',
                                            marginBottom: 24,
                                        },
                                    ]}
                                >
                                    <TextInput
                                        placeholder="Enter new password"
                                        placeholderTextColor="#ffffff55"
                                        style={[
                                            styles.textInputTitle,
                                            {
                                                width: '82%',
                                                fontSize: 16,
                                                color: '#fff',
                                            },
                                        ]}
                                        maxLength={30}
                                        autoCapitalize="none"
                                        secureTextEntry={
                                            !newPassVis
                                        }
                                        selectionColor="#00ffff"
                                        cursorColor="#00ffff"
                                        value={
                                            updatePass.password
                                        }
                                        onChangeText={(
                                            val
                                        ) =>
                                            setUpdatePass(
                                                {
                                                    ...updatePass,
                                                    password:
                                                        val,
                                                }
                                            )
                                        }
                                    />

                                    <TouchableOpacity
                                        onPress={() =>
                                            setNewPassVis(
                                                !newPassVis
                                            )
                                        }
                                    >
                                        <Feather
                                            name={
                                                newPassVis
                                                    ? 'eye'
                                                    : 'eye-off'
                                            }
                                            color="#ffffff88"
                                            size={18}
                                            style={{
                                                marginRight: 10,
                                            }}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            {/* Confirm Password */}
                            <Animated.View
                                entering={FadeInUp.delay(
                                    350
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
                                    Confirm Password
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
                                            flexDirection:
                                                'row',
                                            alignItems:
                                                'center',
                                            marginBottom: 36,
                                        },
                                    ]}
                                >
                                    <TextInput
                                        placeholder="Confirm new password"
                                        placeholderTextColor="#ffffff55"
                                        style={[
                                            styles.textInputTitle,
                                            {
                                                width: '82%',
                                                fontSize: 16,
                                                color: '#fff',
                                            },
                                        ]}
                                        maxLength={30}
                                        autoCapitalize="none"
                                        secureTextEntry={
                                            !conPassVis
                                        }
                                        selectionColor="#00ffff"
                                        cursorColor="#00ffff"
                                        value={
                                            updatePass.confirmPass
                                        }
                                        onChangeText={(
                                            val
                                        ) =>
                                            setUpdatePass(
                                                {
                                                    ...updatePass,
                                                    confirmPass:
                                                        val,
                                                }
                                            )
                                        }
                                    />

                                    <TouchableOpacity
                                        onPress={() =>
                                            setConPassVis(
                                                !conPassVis
                                            )
                                        }
                                    >
                                        <Feather
                                            name={
                                                conPassVis
                                                    ? 'eye'
                                                    : 'eye-off'
                                            }
                                            color="#ffffff88"
                                            size={18}
                                            style={{
                                                marginRight: 10,
                                            }}
                                        />
                                    </TouchableOpacity>
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
                                        450
                                    ).duration(700)}
                                    style={
                                        buttonAnimatedStyle
                                    }
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={
                                            handleResetPassword
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
                                                Reset Password
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}

                            {/* Back */}
                            <Animated.View
                                entering={FadeIn.delay(
                                    650
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
                    </ScrollView>

                    <StatusBar
                        style="light"
                        backgroundColor="transparent"
                    />
                </KeyboardAvoidingView>
            </LinearGradient>
        </TouchableWithoutFeedback>
    );
};

export default ForgotPassword;