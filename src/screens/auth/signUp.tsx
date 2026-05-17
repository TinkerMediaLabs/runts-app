import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TextInput,
    ActivityIndicator,
    Keyboard,
    Dimensions,
    ScrollView,
} from 'react-native';

import Feather from '@react-native-vector-icons/feather';

import { StatusBar } from 'expo-status-bar';

import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    Layout,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import useStyles from '../../theme/authStyles';

const { width, height } = Dimensions.get('window');

const SignUp = ({ navigation }: any) => {
    const styles = useStyles();

    const [isErr, setIsErr] = useState(false);

    const [noMatch, setNoMatch] = useState(false);

    const [shortPass, setShortPass] = useState(false);

    const [userExist, setUserExist] = useState(false);

    const [seePass, setSeePass] = useState(true);

    const [seeConPass, setSeeConPass] = useState(true);

    const [signingUp, setSigningUp] = useState(false);

    const [data, setData] = useState({
        email: '',
        password: '',
        confirm_password: '',
        check_textInputChange: false,
        secureTextEntry: true,
        confirm_secureTextEntry: true,
    });

    // animations
    const formOpacity = useSharedValue(0);

    const formTranslateY = useSharedValue(30);

    const buttonScale = useSharedValue(1);

    const glowOpacity = useSharedValue(0.25);

    useEffect(() => {
        formOpacity.value = withTiming(1, {
            duration: 700,
        });

        formTranslateY.value = withSpring(0, {
            damping: 14,
            stiffness: 120,
        });

        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.5, { duration: 1800 }),
                withTiming(0.2, { duration: 1800 })
            ),
            -1,
            true
        );
    }, []);

    const formAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: formOpacity.value,
            transform: [
                {
                    translateY: formTranslateY.value,
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

    const glowAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: glowOpacity.value,
        };
    });

    const CreateUser = async () => {
        const { password, email } = data;

        let username = email.replace(/ /g, '');

        setSigningUp(true);

        try {
            const { user } = await Auth.signUp({
                username,
                password,
            });

            if (user) {
                navigation.navigate('ConfirmEmail', {
                    username,
                    password,
                });
            }
        } catch (error: any) {
            console.log('error signing up:', error);

            error.code === 'UsernameExistsException'
                ? setUserExist(true)
                : setIsErr(true);
        }

        setSigningUp(false);
    };

    const textInputChange = (val: any) => {
        setData({
            ...data,
            email: val,
            check_textInputChange: val.length !== 0,
        });
    };

    const handlePasswordChange = (val: any) => {
        setData({
            ...data,
            password: val,
        });
    };

    const handleConfirmPasswordChange = (val: any) => {
        setData({
            ...data,
            confirm_password: val,
        });
    };

    const handleSignUp = () => {
        buttonScale.value = withSequence(
            withTiming(0.96, { duration: 100 }),
            withSpring(1)
        );

        const { password, confirm_password } = data;

        setIsErr(false);

        setNoMatch(false);

        setShortPass(false);

        setUserExist(false);

        if (password.length < 6) {
            setShortPass(true);
            return;
        }

        if (password !== confirm_password) {
            setNoMatch(true);
            return;
        }

        CreateUser();
    };

    const renderError = () => {
        let message = '';

        if (userExist) {
            message =
                'An account already exists with this email.';
        } else if (shortPass) {
            message =
                'Password must be at least 6 characters.';
        } else if (noMatch) {
            message = 'Passwords do not match.';
        } else if (isErr) {
            message = 'Error signing up. Please try again.';
        }

        if (!message) return null;

        return (
            <Animated.View
                layout={Layout.springify()}
                entering={FadeInDown.duration(350)}
                style={{
                    backgroundColor: '#ff444415',
                    borderWidth: 1,
                    borderColor: '#ff444440',
                    padding: 14,
                    borderRadius: 18,
                    marginBottom: 24,
                }}
            >
                <Text
                    style={{
                        color: '#ff9b9b',
                        textAlign: 'center',
                        fontSize: 13,
                    }}
                >
                    {message}
                </Text>
            </Animated.View>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View
                style={[
                    styles.container,
                    {
                        minHeight: height,
                    },
                ]}
            >
                {/* background glow */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        {
                            position: 'absolute',
                            top: -120,
                            alignSelf: 'center',
                            width: 320,
                            height: 320,
                            borderRadius: 999,
                            backgroundColor: '#00ffff',
                            opacity: 0.15,
                        },
                        glowAnimatedStyle,
                    ]}
                />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        paddingVertical: 60,
                        paddingHorizontal: 24,
                    }}
                >
                    <Animated.View style={formAnimatedStyle}>
                        {/* header */}
                        <Animated.View
                            entering={FadeInDown.delay(100).duration(
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
                                Create Account
                            </Text>

                            <Text
                                style={[
                                    styles.paragraph,
                                    {
                                        color: '#ffffff88',
                                        marginBottom: 40,
                                        lineHeight: 22,
                                    },
                                ]}
                            >
                                Start building your library and
                                continue your stories across every
                                device.
                            </Text>
                        </Animated.View>

                        {renderError()}

                        {/* EMAIL */}
                        <Animated.View
                            entering={FadeInUp.delay(250).duration(
                                700
                            )}
                        >
                            <Text
                                style={[
                                    styles.title,
                                    {
                                        marginBottom: 8,
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
                                       // minHeight: 56,
                                        borderRadius: 18,
                                        paddingHorizontal: 16,
                                        marginBottom: 20,
                                        justifyContent: 'center',
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
                                            flex: 1,
                                        },
                                    ]}
                                    value={data.email}
                                    maxLength={40}
                                    onChangeText={textInputChange}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    cursorColor="#00ffff"
                                />
                            </View>
                        </Animated.View>

                        {/* PASSWORD */}
                        <Animated.View
                            entering={FadeInUp.delay(350).duration(
                                700
                            )}
                        >
                            <Text
                                style={[
                                    styles.title,
                                    {
                                        marginBottom: 8,
                                        fontSize: 14,
                                    },
                                ]}
                            >
                                Password
                            </Text>

                            <View
                                style={[
                                    styles.inputfield,
                                    {
                                        //minHeight: 56,
                                        borderRadius: 18,
                                        paddingHorizontal: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginBottom: 20,
                                    },
                                ]}
                            >
                                <TextInput
                                    placeholder="Create a password"
                                    placeholderTextColor="#ffffff55"
                                    style={[
                                        styles.textInputTitle,
                                        {
                                            fontSize: 16,
                                            flex: 1,
                                        },
                                    ]}
                                    value={data.password}
                                    maxLength={20}
                                    autoCapitalize="none"
                                    secureTextEntry={seePass}
                                    onChangeText={
                                        handlePasswordChange
                                    }
                                    cursorColor="#00ffff"
                                />

                                <TouchableOpacity
                                    onPress={() =>
                                        setSeePass(!seePass)
                                    }
                                >
                                    <Feather
                                        name={
                                            seePass
                                                ? 'eye-off'
                                                : 'eye'
                                        }
                                        color="#ffffff88"
                                        size={18}
                                    />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* CONFIRM PASSWORD */}
                        <Animated.View
                            entering={FadeInUp.delay(450).duration(
                                700
                            )}
                        >
                            <Text
                                style={[
                                    styles.title,
                                    {
                                        marginBottom: 8,
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
                                        //minHeight: 56,
                                        borderRadius: 18,
                                        paddingHorizontal: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    },
                                ]}
                            >
                                <TextInput
                                    placeholder="Confirm password"
                                    placeholderTextColor="#ffffff55"
                                    style={[
                                        styles.textInputTitle,
                                        {
                                            fontSize: 16,
                                            flex: 1,
                                        },
                                    ]}
                                    value={
                                        data.confirm_password
                                    }
                                    maxLength={20}
                                    autoCapitalize="none"
                                    secureTextEntry={seeConPass}
                                    onChangeText={
                                        handleConfirmPasswordChange
                                    }
                                    cursorColor="#00ffff"
                                />

                                <TouchableOpacity
                                    onPress={() =>
                                        setSeeConPass(
                                            !seeConPass
                                        )
                                    }
                                >
                                    <Feather
                                        name={
                                            seeConPass
                                                ? 'eye-off'
                                                : 'eye'
                                        }
                                        color="#ffffff88"
                                        size={18}
                                    />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* BUTTONS */}
                        <Animated.View
                            entering={FadeInUp.delay(600).duration(
                                700
                            )}
                            style={{
                                marginTop: 40,
                            }}
                        >
                            {signingUp ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#00ffff"
                                />
                            ) : (
                                <Animated.View
                                    style={
                                        buttonAnimatedStyle
                                    }
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={
                                            //handleSignUp
                                            () => navigation.navigate('Waiting')
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.buttonlayout,
                                                {
                                                    alignSelf:
                                                        'center',
                                                    borderRadius: 22,
                                                    shadowColor:
                                                        '#00ffff',
                                                    shadowOpacity: 0.35,
                                                    shadowRadius: 18,
                                                    opacity: 0.8,
                                                    //elevation: 10,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.buttontext,
                                                    {
                                                        fontWeight:
                                                            '700',
                                                        marginVertical: 0,
                                                    },
                                                ]}
                                            >
                                                Create Account
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}

                            <TouchableOpacity
                                onPress={() =>
                                    navigation.navigate(
                                        'SignIn'
                                    )
                                }
                            >
                                <Text
                                    style={[
                                        styles.paragraph,
                                        {
                                            alignSelf: 'center',
                                            marginTop: 34,
                                            color: '#ffffff88',
                                        },
                                    ]}
                                >
                                    I already have an account
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
                </ScrollView>

                <StatusBar
                    style={'light'}
                    backgroundColor="transparent"
                />
            </View>
        </TouchableWithoutFeedback>
    );
};

export default SignUp;