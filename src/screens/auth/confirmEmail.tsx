import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Keyboard,
    TouchableWithoutFeedback,
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

import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import useStyles from '../../theme/authStyles';
import { confirmUserEmail, resendCode } from '../../services/auth';

const { width, height } = Dimensions.get('window');

const ConfirmEmail = ({ navigation, route }: any) => {
    const styles = useStyles();
    const email = route?.params?.email ?? '';

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [resentMsg, setResentMsg] = useState('');

    const contentOpacity = useSharedValue(0);
    const contentTranslateY = useSharedValue(30);
    const buttonScale = useSharedValue(1);

    useEffect(() => {
        contentOpacity.value = withTiming(1, { duration: 700 });
        contentTranslateY.value = withSpring(0, { damping: 14, stiffness: 120 });
    }, []);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateY: contentTranslateY.value }],
    }));

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const handleConfirm = async () => {
        if (!code.trim()) {
            setError('Please enter the verification code.');
            return;
        }

        setLoading(true);
        setError('');

        buttonScale.value = withSequence(
            withTiming(0.96, { duration: 100 }),
            withSpring(1)
        );

        try {
            await confirmUserEmail(email, code.trim());
            navigation.navigate('EmailSignIn');
        } catch (err: any) {
            console.log(err);
            setError(err?.message || 'Invalid code. Please try again.');
        }

        setLoading(false);
    };

    const handleResend = async () => {
        setResending(true);
        setError('');
        setResentMsg('');

        try {
            await resendCode(email);
            setResentMsg('A new code has been sent to your email.');
        } catch (err: any) {
            setError(err?.message || 'Error resending code.');
        }

        setResending(false);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <LinearGradient
                colors={['#000000', '#050505', '#0a0a0a']}
                style={{ flex: 1 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
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
                            style={[{ paddingHorizontal: 24 }, animatedContainerStyle]}
                        >
                            {/* Header */}
                            <Animated.View entering={FadeInDown.duration(700)}>
                                <Text style={[styles.title, { fontSize: 34, marginBottom: 12 }]}>
                                    Verify Email
                                </Text>
                                <Text style={[styles.paragraph, { color: '#ffffff88', lineHeight: 22, marginBottom: 40 }]}>
                                    We sent a verification code to{' '}
                                    <Text style={{ color: '#00ffff' }}>{email}</Text>
                                </Text>
                            </Animated.View>

                            {/* Error */}
                            {error ? (
                                <Animated.View
                                    entering={FadeIn.duration(250)}
                                    style={{
                                        backgroundColor: '#ff444415',
                                        borderWidth: 1,
                                        borderColor: '#ff444440',
                                        borderRadius: 18,
                                        padding: 14,
                                        marginBottom: 24,
                                    }}
                                >
                                    <Text style={{ color: '#ff8a8a', fontSize: 13, textAlign: 'center' }}>
                                        {error}
                                    </Text>
                                </Animated.View>
                            ) : null}

                            {/* Success resend msg */}
                            {resентMsg ? (
                                <Animated.View
                                    entering={FadeIn.duration(250)}
                                    style={{
                                        backgroundColor: '#00ffff15',
                                        borderWidth: 1,
                                        borderColor: '#00ffff40',
                                        borderRadius: 18,
                                        padding: 14,
                                        marginBottom: 24,
                                    }}
                                >
                                    <Text style={{ color: '#00ffff', fontSize: 13, textAlign: 'center' }}>
                                        {resентMsg}
                                    </Text>
                                </Animated.View>
                            ) : null}

                            {/* Code Input */}
                            <Animated.View entering={FadeInUp.delay(150).duration(700)}>
                                <Text style={[styles.title, { marginBottom: 8, marginHorizontal: 0, fontSize: 14 }]}>
                                    Verification Code
                                </Text>
                                <View style={[styles.inputfield, { borderRadius: 18, backgroundColor: '#1a1a1a', borderColor: '#ffffff10', justifyContent: 'center', marginBottom: 32 }]}>
                                    <TextInput
                                        placeholder="Enter your code"
                                        placeholderTextColor="#ffffff55"
                                        style={[styles.textInputTitle, { fontSize: 16, color: '#fff' }]}
                                        maxLength={6}
                                        keyboardType="number-pad"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        selectionColor="#00ffff"
                                        cursorColor="#00ffff"
                                        value={code}
                                        onChangeText={setCode}
                                    />
                                </View>
                            </Animated.View>

                            {/* Button */}
                            {loading ? (
                                <ActivityIndicator size="small" color="#00ffff" />
                            ) : (
                                <Animated.View
                                    entering={FadeInUp.delay(300).duration(700)}
                                    style={buttonAnimatedStyle}
                                >
                                    <TouchableOpacity activeOpacity={0.9} onPress={handleConfirm}>
                                        <View
                                            style={[
                                                styles.buttonlayout,
                                                {
                                                    alignSelf: 'center',
                                                    width: width * 0.86,
                                                    borderRadius: 22,
                                                    backgroundColor: '#00ffff',
                                                    shadowColor: '#00ffff',
                                                    shadowOpacity: 0.3,
                                                    shadowRadius: 18,
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.buttontext, { width: '100%', fontSize: 16, fontWeight: '700' }]}>
                                                Verify Email
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}

                            {/* Resend */}
                            <Animated.View entering={FadeIn.delay(500).duration(900)}>
                                {resending ? (
                                    <ActivityIndicator size="small" color="#ffffff55" style={{ marginTop: 32 }} />
                                ) : (
                                    <TouchableOpacity onPress={handleResend}>
                                        <Text style={{ fontSize: 14, color: '#ffffff66', alignSelf: 'center', marginTop: 32 }}>
                                            Didn't get a code?{' '}
                                            <Text style={{ color: '#00ffff' }}>Resend</Text>
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </Animated.View>

                            {/* Back */}
                            <Animated.View entering={FadeIn.delay(600).duration(900)}>
                                <TouchableOpacity onPress={() => navigation.goBack()}>
                                    <Text style={{ fontSize: 14, color: '#ffffff66', alignSelf: 'center', marginTop: 16 }}>
                                        Go Back
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </Animated.View>

                        <StatusBar style="light" backgroundColor="transparent" />
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient>
        </TouchableWithoutFeedback>
    );
};

export default ConfirmEmail;
