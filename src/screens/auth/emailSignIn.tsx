import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    TextInput,
    Linking,
    ActivityIndicator,
    Keyboard,
    TouchableWithoutFeedback,
    ScrollView,
} from 'react-native';

import Feather from '@react-native-vector-icons/feather';
import { StatusBar } from 'expo-status-bar';

import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import useStyles from '../../theme/authStyles';

const { width, height } = Dimensions.get('window');

const EmailSignIn = ({ navigation }: any) => {
    const styles = useStyles();

    const [seePass, setSeePass] = useState(false);

    const [isErr, setIsErr] = useState(false);

    const [err, setErr] = useState('Error signing in.');

    const [signingIn, setSigningIn] = useState(false);

    const [data, setData] = useState({
        username: '',
        password: '',
    });

    // animations
    const buttonScale = useSharedValue(1);
    const formOpacity = useSharedValue(0);
    const formTranslateY = useSharedValue(30);

    useEffect(() => {
        formOpacity.value = withTiming(1, { duration: 700 });
        formTranslateY.value = withSpring(0, {
            damping: 14,
            stiffness: 120,
        });
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

    const signInButtonAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: buttonScale.value }],
        };
    });

    const handlePassword = (val: any) => {
        setData({
            ...data,
            password: val,
        });
    };

    const handleUsername = (val: any) => {
        setData({
            ...data,
            username: val,
        });
    };

    const CreateUser = async () => {
        const { password } = data;

        const username = data.username.replace(/ /g, '');

        const userInfo = await Auth.currentAuthenticatedUser({
            bypassCache: true,
        });

        if (userInfo === 'The user is not authenticated') {
            setSigningIn(false);
            return;
        }

        if (userInfo.attributes.email_verified === false) {
            await Auth.resendSignUp(username).then(
                navigation.navigate('ConfirmEmail', {
                    username,
                    password,
                })
            );

            setSigningIn(false);
        } else if (userInfo) {
            const userData = await API.graphql(
                graphqlOperation(getUser, {
                    id: userInfo.attributes.sub,
                })
            );

            if (userData.data.getUser) {
                setUserID(userData.data.getUser);

                setIsErr(false);

                navigation.navigate('Redirect', {
                    trigger: Math.random(),
                });
            }
        }
    };

    async function signIn() {
        buttonScale.value = withSequence(
            withTiming(0.96, { duration: 100 }),
            withSpring(1)
        );

        setSigningIn(true);

        const { username, password } = data;

        try {
            await Auth.signIn(
                username.replace(/ /g, ''),
                password
            ).then(CreateUser);
        } catch (error: any) {
            console.log(error.message);

            setErr(error?.message.toString());

            setIsErr(true);

            setSigningIn(false);
        }
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View
                style={[
                    styles.container,
                    {
                        justifyContent: 'center',
                        height,
                    },
                ]}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        minHeight: height,
                        justifyContent: 'center',
                        paddingVertical: 40,
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View
                        style={[
                            {
                                paddingHorizontal: 24,
                            },
                            formAnimatedStyle,
                        ]}
                    >
                        <Animated.View
                            entering={FadeInDown.delay(100).duration(700)}
                        >
                            <Text
                                style={[
                                    styles.title,
                                    {
                                        fontSize: 34,
                                        marginBottom: 10,
                                    },
                                ]}
                            >
                                Welcome Back
                            </Text>

                            <Text
                                style={[
                                    styles.paragraph,
                                    {
                                        color: '#ffffff88',
                                        marginBottom: 40,
                                    },
                                ]}
                            >
                                Sign in to continue listening.
                            </Text>
                        </Animated.View>

                        {isErr ? (
                            <Animated.View
                                entering={FadeIn.duration(300)}
                                style={{
                                    backgroundColor: '#ff444420',
                                    borderWidth: 1,
                                    borderColor: '#ff444455',
                                    borderRadius: 16,
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
                                    {err}
                                </Text>
                            </Animated.View>
                        ) : null}

                        <Animated.View
                            entering={FadeInUp.delay(250).duration(700)}
                        >
                            <Text
                                style={[
                                    styles.title,
                                    {
                                        marginHorizontal: 0,
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
                                        marginBottom: 20,
                                        borderRadius: 18,
                                    },
                                ]}
                            >
                                <TextInput
                                        placeholder="Enter your email"
                                        placeholderTextColor="#ffffff55"
                                        style={styles.textInputTitle}
                                        value={data.username}
                                        onChangeText={handleUsername}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        autoCorrect={false}
                                        cursorColor="#00ffff"
                                />
                            </View>
                        </Animated.View>

                        <Animated.View
                            entering={FadeInUp.delay(350).duration(700)}
                        >
                            <Text
                                style={[
                                    styles.title,
                                    {
                                        marginHorizontal: 0,
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
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderRadius: 18,
                                    },
                                ]}
                            >
                                <TextInput
                                    placeholder="Enter your password"
                                    placeholderTextColor="#ffffff55"
                                    style={[
                                        styles.textInputTitle,
                                        {
                                            paddingRight: 10,
                                        },
                                    ]}
                                    value={data.password}
                                    maxLength={30}
                                    secureTextEntry={!seePass}
                                    onChangeText={handlePassword}
                                    autoCapitalize="none"
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

                        <Animated.View
                            entering={FadeInUp.delay(450).duration(700)}
                            style={{
                                marginTop: 18,
                                marginBottom: 30,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() =>
                                    navigation.navigate(
                                        'ForgotPassword'
                                    )
                                }
                            >
                                <Text
                                    style={[
                                        styles.paragraph,
                                        {
                                            color: '#00ffff99',
                                        },
                                    ]}
                                >
                                    Forgot password
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {signingIn ? (
                            <ActivityIndicator
                                size="small"
                                color="cyan"
                            />
                        ) : (
                            <Animated.View
                                entering={FadeInUp.delay(550).duration(700)}
                            >
                                <Animated.View
                                    style={
                                        signInButtonAnimatedStyle
                                    }
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={() =>
                                            signIn()
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.socialbuttonlayout,
                                                {
                                                    justifyContent:
                                                        'center',
                                                    backgroundColor:
                                                        '#00ffff',
                                                    marginBottom: 18,
                                                    borderRadius: 18,
                                                    shadowColor:
                                                        '#00ffff',
                                                    shadowOpacity: 0.3,
                                                    shadowRadius: 20,
                                                    //elevation: 10,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.socialbuttontext,
                                                    {
                                                        width:
                                                            width *
                                                            0.62,
                                                        color:
                                                            '#000',
                                                        marginVertical: 2,
                                                        fontWeight:
                                                            '700',
                                                    },
                                                ]}
                                            >
                                                Sign In
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>

                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        navigation.navigate(
                                            'SignUp'
                                        )
                                    }
                                >
                                    <View
                                        style={[
                                            styles.socialbuttonlayout,
                                            {
                                                borderColor:
                                                    '#ffffff33',
                                                borderWidth: 1,
                                                justifyContent:
                                                    'center',
                                                marginBottom: 18,
                                                backgroundColor:
                                                    '#ffffff08',
                                                borderRadius: 18,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.socialbuttontext,
                                                {
                                                    width:
                                                        width *
                                                        0.62,
                                                    color:
                                                        '#fff',
                                                    marginVertical: 2,
                                                    fontWeight:
                                                        '700',
                                                },
                                            ]}
                                        >
                                            Create an account
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() =>
                                        navigation.goBack()
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.buttontext,
                                            {
                                                fontWeight: '400',
                                                alignSelf:
                                                    'center',
                                                marginTop: 20,
                                                color:
                                                    '#ffffff66',
                                            },
                                        ]}
                                    >
                                        Use a different method
                                    </Text>
                                </TouchableOpacity>

                                <Animated.View
                                    entering={FadeIn.delay(
                                        900
                                    ).duration(1000)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent:
                                            'space-between',
                                        marginTop: 50,
                                        paddingHorizontal: 10,
                                    }}
                                >
                                    <TouchableOpacity
                                        onPress={() =>
                                            Linking.openURL(
                                                'mailto:admin@tinkermedia.net'
                                            )
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.paragraph,
                                                {
                                                    color:
                                                        '#ffffff55',
                                                },
                                            ]}
                                        >
                                            Contact us
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() =>
                                            Linking.openURL(
                                                'https://www.tinkermedia.net/runts/terms/'
                                            )
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.paragraph,
                                                {
                                                    color:
                                                        '#ffffff55',
                                                },
                                            ]}
                                        >
                                            Terms of Use
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            </Animated.View>
                        )}
                    </Animated.View>

                    <StatusBar
                        style="light"
                        backgroundColor="transparent"
                    />
                </ScrollView>
            </View>
        </TouchableWithoutFeedback>
    );
};

export default EmailSignIn;