//screen for confirming the email address of the user after registration

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
    ScrollView,
    Linking,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

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

import Feather from '@react-native-vector-icons/feather';

import useStyles from '../../theme/authStyles';

const { width, height } = Dimensions.get('window');

const ConfirmEmail = ({
    navigation,
    route,
}: {
    navigation: any;
    route: any;
}) => {
    const styles = useStyles();

    const [loggingIn, setLoggingIn] = useState(false);

    const { username, password } = route.params;

    const [data, setData] = useState({
        username: username,
        code: '',
        password: password,
    });

    // animations
    const formOpacity = useSharedValue(0);

    const formTranslateY = useSharedValue(40);

    const buttonScale = useSharedValue(1);

    useEffect(() => {
        formOpacity.value = withTiming(1, {
            duration: 700,
        });

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

    const buttonAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: buttonScale.value,
                },
            ],
        };
    });

    async function confirmSignUp() {
        const { username, code, password } = data;

        buttonScale.value = withSequence(
            withTiming(0.96, {
                duration: 100,
            }),
            withSpring(1)
        );

        setLoggingIn(true);

        try {
            let result = await Auth.confirmSignUp(
                username,
                code
            );

            if (result) {
                let signin = await Auth.signIn(
                    username,
                    password
                );

                if (signin) {
                    const userInfo =
                        await Auth.currentAuthenticatedUser({
                            bypassCache: true,
                        });

                    if (userInfo) {
                        const newUser = {
                            id: userInfo.attributes.sub,
                            type: 'User',
                            name: userInfo.attributes.name,
                        };

                        const createdUser =
                            await API.graphql(
                                graphqlOperation(
                                    createUser,
                                    {
                                        input: newUser,
                                    }
                                )
                            );

                        if (createdUser) {
                            navigation.navigate(
                                'Welcome'
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.log(
                'error confirming sign up',
                error
            );

            alert(
                'Error confirming account. Please try again.'
            );
        }

        setLoggingIn(false);
    }

    async function resendConfirmationCode() {
        try {
            await Auth.resendSignUp(username);

            alert(
                'Confirmation code resent. Please check your email.'
            );
        } catch (err) {
            console.log(
                'error resending code: ',
                err
            );

            alert('Error sending code.');
        }
    }

    const handleCode = (val: any) => {
        setData({
            ...data,
            code: val,
        });
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
                {/* glow background */}
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: -120,
                        right: -80,
                        width: 260,
                        height: 260,
                        borderRadius: 260,
                        backgroundColor: '#00ffff15',
                    }}
                />

                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        bottom: -120,
                        left: -80,
                        width: 240,
                        height: 240,
                        borderRadius: 240,
                        backgroundColor: '#00ffff10',
                    }}
                />

                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={
                        false
                    }
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
                            formAnimatedStyle,
                        ]}
                    >
                        {/* header */}
                        <Animated.View
                            entering={FadeInDown.delay(
                                100
                            ).duration(700)}
                        >
                            <View
                                style={{
                                    alignSelf: 'center',
                                    width: 74,
                                    height: 74,
                                    borderRadius: 74,
                                    backgroundColor:
                                        '#00ffff15',
                                    borderWidth: 1,
                                    borderColor:
                                        '#00ffff25',
                                    justifyContent:
                                        'center',
                                    alignItems:
                                        'center',
                                    marginBottom: 28,
                                }}
                            >
                                <Feather
                                    name="mail"
                                    size={30}
                                    color="#00ffff"
                                />
                            </View>

                            <Text
                                style={[
                                    styles.title,
                                    {
                                        fontSize: 34,
                                        textAlign:
                                            'center',
                                        marginBottom: 10,
                                    },
                                ]}
                            >
                                Verify Email
                            </Text>

                            <Text
                                style={[
                                    styles.paragraph,
                                    {
                                        color:
                                            '#ffffff88',
                                        textAlign:
                                            'center',
                                        lineHeight: 22,
                                        marginBottom: 40,
                                        paddingHorizontal: 8,
                                    },
                                ]}
                            >
                                Enter the confirmation
                                code sent to your email
                                address to finish creating
                                your account.
                            </Text>
                        </Animated.View>

                        {/* confirmation code */}
                        <Animated.View
                            entering={FadeInUp.delay(
                                250
                            ).duration(700)}
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
                                Confirmation Code
                            </Text>

                            <View
                                style={[
                                    styles.inputfield,
                                    {
                                        //height: 58,
                                        borderRadius: 18,
                                        backgroundColor:
                                            '#151515',
                                        //borderWidth: 1,
                                        borderColor:
                                            '#ffffff12',
                                        justifyContent:
                                            'center',
                                        marginBottom: 12,
                                    },
                                ]}
                            >
                                <TextInput
                                    placeholder="Check your email for the code"
                                    placeholderTextColor="#ffffff40"
                                    style={[
                                        styles.textInputTitle,
                                        {
                                            fontSize: 16,
                                            paddingHorizontal: 4,
                                        },
                                    ]}
                                    maxLength={30}
                                    onChangeText={
                                        handleCode
                                    }
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="number-pad"
                                    cursorColor="#00ffff"
                                    selectionColor="#00ffff"
                                />
                            </View>
                        </Animated.View>

                        {/* resend */}
                        <Animated.View
                            entering={FadeInUp.delay(
                                350
                            ).duration(700)}
                            style={{
                                marginBottom: 40,
                            }}
                        >
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={
                                    resendConfirmationCode
                                }
                            >
                                <Text
                                    style={[
                                        styles.paragraph,
                                        {
                                            color:
                                                '#00ffff99',
                                        },
                                    ]}
                                >
                                    Resend confirmation
                                    code
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* button */}
                        <Animated.View
                            entering={FadeInUp.delay(
                                450
                            ).duration(700)}
                        >
                            {loggingIn ? (
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
                                        activeOpacity={
                                            0.9
                                        }
                                        onPress={
                                            confirmSignUp
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
                                                    borderRadius: 18,
                                                    marginBottom: 18,
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
                                                        //marginVertical: 6,
                                                        fontWeight:
                                                            '700',
                                                    },
                                                ]}
                                            >
                                                Confirm
                                                Account
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}
                        </Animated.View>

                        {/* go back */}
                        <Animated.View
                            entering={FadeIn.delay(
                                700
                            ).duration(900)}
                        >
                            <TouchableOpacity
                                onPress={() =>
                                    navigation.navigate(
                                        'SignUp'
                                    )
                                }
                            >
                                <Text
                                    style={[
                                        styles.buttontext,
                                        {
                                            fontWeight:
                                                '400',
                                            color:
                                                '#ffffff66',
                                            alignSelf:
                                                'center',
                                            marginTop: 20,
                                        },
                                    ]}
                                >
                                    Go Back
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* footer */}
                        <Animated.View
                            entering={FadeIn.delay(
                                1000
                            ).duration(1000)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent:
                                    'space-between',
                                marginTop: 60,
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
                </ScrollView>

                <StatusBar
                    style="light"
                    backgroundColor="transparent"
                />
            </LinearGradient>
        </TouchableWithoutFeedback>
    );
};

export default ConfirmEmail;