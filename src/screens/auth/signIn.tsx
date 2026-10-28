import React, { useState, useEffect } from 'react';
import { TERMS_URL, PRIVACY_URL } from '../../constants/legal';
import { View, TouchableOpacity, Dimensions, Linking, ActivityIndicator, Keyboard, TouchableWithoutFeedback, Image } from 'react-native';
import { Text } from '@/components/common/AppText';

import { StatusBar } from 'expo-status-bar';

import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useSharedValue,
    withTiming,
    withSpring,
    Easing,
} from 'react-native-reanimated';

import useStyles from '../../theme/authStyles';

import { signInWithGoogle as googleSignIn, signInWithApple as appleSignIn } from '../../services/auth';
import { signInWithRedirect } from 'aws-amplify/auth';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';

const { width, height } = Dimensions.get('window');

const SignIn = ({ navigation }: any) => {

    const styles = useStyles();

    const [isErr, setIsErr] = useState(false);
    const [err, setErr] = useState('Error signing in.');
    const [signingIn, setSigningIn] = useState(false);

    // logo animation values
    const logoScale = useSharedValue(0.85);
    const logoOpacity = useSharedValue(0);
    const logoTranslateY = useSharedValue(30);

    useEffect(() => {
        logoOpacity.value = withTiming(1, {
            duration: 700,
            easing: Easing.out(Easing.ease),
        });

        logoTranslateY.value = withTiming(0, {
            duration: 700,
            easing: Easing.out(Easing.exp),
        });

        logoScale.value = withSpring(1, {
            damping: 12,
            stiffness: 120,
        });
    }, []);

    async function signInWithGoogle() {
        setSigningIn(true);
        try {
            await googleSignIn();
        } catch (err: any) {
            console.log('Google sign in error:', err);
            setIsErr(true);
            setErr(err?.message || 'Error signing in with Google.');
        } finally {
            setSigningIn(false);
        }
    }

    async function signInWithApple() {
        setSigningIn(true);
        try {
            await appleSignIn();
        } catch (err: any) {
            console.log('Apple sign in error:', err);
            setIsErr(true);
            setErr(err?.message || 'Error signing in with Apple.');
        } finally {
            setSigningIn(false);
        }
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessibilityRole="none">
            <View
                style={[
                    styles.container,
                    {
                        justifyContent: 'center',
                        minHeight: height,
                        paddingHorizontal: 24,
                    },
                ]}
            >
                {signingIn ? (
                    <Animated.View entering={FadeIn.duration(300)}>
                        <ActivityIndicator size="small" color={colors.accent} />
                    </Animated.View>
                ) : (
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'space-between',
                            paddingVertical: 60,
                        }}
                    >

                        {/* LOGO */}
                        <Animated.View
                            style={{
                                alignItems: 'center',
                                marginTop: 10,
                                opacity: logoOpacity,
                            }}
                        >
                            <Animated.View
                                style={{
                                    transform: [
                                        { translateY: logoTranslateY },
                                        { scale: logoScale },
                                    ],
                                }}
                            >
                                <Image
                                    style={{
                                        height: width * 0.52,
                                        width: width * 0.52,
                                        resizeMode: 'contain',
                                    }}
                                    source={require('../../../assets/images/icon.png')}
                                />
                            </Animated.View>
                        </Animated.View>

                        {/* BUTTONS */}
                        <View>

                            {/* ERROR */}
                            {isErr ? (
                                <Animated.View
                                    entering={FadeIn.duration(250)}
                                    style={{
                                        backgroundColor: '#ff444415',
                                        borderWidth: 1,
                                        borderColor: '#ff444440',
                                        borderRadius: radius.xl,
                                        padding: 14,
                                        marginBottom: 16,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: '#ff8a8a',
                                            fontSize: fontSizes.small,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {err}
                                    </Text>
                                </Animated.View>
                            ) : null}

                            {/* EMAIL */}
                            <Animated.View
                                entering={FadeInUp.delay(250).springify()}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    accessibilityRole="button"
                                    accessibilityLabel="Continue with email"
                                    accessibilityState={{ disabled: signingIn }}
                                    onPress={() =>
                                        !signingIn
                                            ? navigation.navigate('EmailSignIn')
                                            : null
                                    }
                                >
                                    <View
                                        style={[
                                            styles.socialbuttonlayout,
                                            {
                                                marginVertical: 10,
                                                justifyContent: 'center',
                                                backgroundColor: colors.accent,
                                                borderRadius: radius.xl,
                                                opacity: 0.8,
                                            },
                                        ]}
                                    >
                                        <Image
                                            source={require('../../../assets/images/icon24b.png')}
                                            style={{
                                                width: 20,
                                                height: 20,
                                                marginVertical: 5,
                                            }}
                                        />

                                        <Text
                                            style={[
                                                styles.socialbuttontext,
                                                {
                                                    width: width * 0.62,
                                                    color: colors.textOnAccent,
                                                    fontWeight: '700',
                                                },
                                            ]}
                                        >
                                            Continue with Email
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* GOOGLE */}
                            <Animated.View
                                entering={FadeInUp.delay(350).springify()}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    accessibilityRole="button"
                                    accessibilityLabel="Continue with Google"
                                    accessibilityState={{ disabled: signingIn }}
                                    onPress={() =>
                                        !signingIn
                                            ? signInWithGoogle()
                                            : null
                                    }
                                >
                                    <View
                                        style={[
                                            styles.socialbuttonlayout,
                                            {
                                                marginVertical: 10,
                                                justifyContent: 'center',
                                                borderRadius: radius.xl,
                                            },
                                        ]}
                                    >
                                        <Image
                                            source={require('../../../assets/images/google-logo.png')}
                                            style={{
                                                width: 28,
                                                height: 28,
                                            }}
                                        />

                                        <Text style={styles.socialbuttontext}>
                                            Continue with Google
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* APPLE */}
                            <Animated.View
                                entering={FadeInUp.delay(450).springify()}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    accessibilityRole="button"
                                    accessibilityLabel="Continue with Apple"
                                    accessibilityState={{ disabled: signingIn }}
                                    onPress={() =>
                                        !signingIn
                                            ? signInWithApple()
                                            : null
                                    }
                                >
                                    <View
                                        style={[
                                            styles.socialbuttonlayout,
                                            {
                                                marginVertical: 10,
                                                backgroundColor: colors.surface0,
                                                borderWidth: 1,
                                                borderColor: '#ffffff22',
                                                justifyContent: 'center',
                                                borderRadius: radius.xl,
                                            },
                                        ]}
                                    >
                                        <Image
                                            source={require('../../../assets/images/apple-logo.png')}
                                            style={{
                                                width: 28,
                                                height: 28,
                                            }}
                                        />

                                        <Text
                                            style={[
                                                styles.socialbuttontext,
                                                {
                                                    backgroundColor: colors.surface0,
                                                },
                                            ]}
                                        >
                                            Continue with Apple
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>

                        {/* FOOTER */}
                        <Animated.View
                            entering={FadeInDown.delay(500).duration(700)}
                        >
                            <View
                                style={{
                                    alignSelf: 'center',
                                    width: width - 60,
                                    borderColor: '#ffffff12',
                                    paddingTop: 20,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.textSecondary,
                                        fontSize: fontSizes.caption,
                                        textAlign: 'center',
                                        lineHeight: 18,
                                        paddingHorizontal: 10,
                                    }}
                                >
                                    By continuing, you agree to our{' '}
                                    <Text
                                        accessibilityRole="link"
                                        style={{ color: colors.accent, textDecorationLine: 'underline' }}
                                        onPress={() => Linking.openURL(TERMS_URL)}
                                    >
                                        Terms of Use
                                    </Text>
                                    {' '}and{' '}
                                    <Text
                                        accessibilityRole="link"
                                        style={{ color: colors.accent, textDecorationLine: 'underline' }}
                                        onPress={() => Linking.openURL(PRIVACY_URL)}
                                    >
                                        Privacy Policy
                                    </Text>
                                    .
                                </Text>
                            </View>

                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginHorizontal: 30,
                                    marginTop: 30,
                                }}
                            >
                                <TouchableOpacity
                                    accessibilityRole="link"
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
                                                color: colors.textSecondary,
                                            },
                                        ]}
                                    >
                                        Contact us
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    accessibilityRole="link"
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
                                                color: colors.textSecondary,
                                            },
                                        ]}
                                    >
                                        Terms of Use
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </View>
                )}

                <StatusBar
                    style="light"
                    backgroundColor="transparent"
                />
            </View>
        </TouchableWithoutFeedback>
    );
};

export default SignIn;