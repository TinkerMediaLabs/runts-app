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
import { loginUser } from '../../services/auth';

const { width, height } = Dimensions.get('window');

const EmailSignIn = ({ navigation }: any) => {
    const styles = useStyles();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const contentOpacity = useSharedValue(0);
    const contentTranslateY = useSharedValue(30);
    const buttonScale = useSharedValue(1);

    useEffect(() => {
        contentOpacity.value = withTiming(1, { duration: 700 });
        contentTranslateY.value = withSpring(0, { damping: 14, stiffness: 120 });
    }, []);

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const handleSignIn = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please enter your email and password.');
            return;
        }

        setLoading(true);
        setError('');

        buttonScale.value = withSequence(
            withTiming(0.96, { duration: 100 }),
            withSpring(1)
        );

        try {
            await loginUser(email.replace(/ /g, ''), password);
            // Hub listener in AppContext will handle navigation automatically
        } catch (err: any) {
            console.log(err);
            if (err?.name === 'UserNotConfirmedException') {
                navigation.navigate('ConfirmEmail', {
                    email: email.replace(/ /g, ''),
                });
            } else {
                setError(err?.message || 'Error signing in. Please try again.');
            }
        }

        setLoading(false);
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
                        <Animated.View style={{ opacity: contentOpacity, paddingHorizontal: 24 }}>
                        <Animated.View style={{ transform: [{ translateY: contentTranslateY }] }}>
                            {/* Header */}
                            <View>
                                <Text style={[styles.title, { fontSize: 34, marginBottom: 12 }]}>
                                    Sign In
                                </Text>
                            </View>

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

                            {/* Email */}
                            <Animated.View entering={FadeInUp.delay(150).duration(700)}>
                                <Text style={[styles.title, { marginBottom: 8, marginHorizontal: 0, fontSize: 14 }]}>
                                    Email
                                </Text>
                                <View style={[styles.inputfield, { borderRadius: 18, backgroundColor: '#1a1a1a', borderColor: '#ffffff10', justifyContent: 'center', marginBottom: 20 }]}>
                                    <TextInput
                                        placeholder="Enter your email"
                                        placeholderTextColor="#ffffff55"
                                        style={[styles.textInputTitle, { fontSize: 16, color: '#fff' }]}
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

                            {/* Password */}
                            <Animated.View entering={FadeInUp.delay(200).duration(700)}>
                                <Text style={[styles.title, { marginBottom: 8, marginHorizontal: 0, fontSize: 14 }]}>
                                    Password
                                </Text>
                                <View style={[styles.inputfield, { borderRadius: 18, backgroundColor: '#1a1a1a', borderColor: '#ffffff10', justifyContent: 'center', marginBottom: 32 }]}>
                                    <TextInput
                                        placeholder="Enter your password"
                                        placeholderTextColor="#ffffff55"
                                        style={[styles.textInputTitle, { fontSize: 16, color: '#fff' }]}
                                        maxLength={40}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        secureTextEntry
                                        selectionColor="#00ffff"
                                        cursorColor="#00ffff"
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                </View>
                            </Animated.View>

                            {/* Forgot Password */}
                            <TouchableOpacity
                                onPress={() => navigation.navigate('ForgotPassword')}
                                style={{ alignSelf: 'flex-end', marginTop: -24, marginBottom: 32 }}
                            >
                                <Text style={{ color: '#00ffff88', fontSize: 13 }}>
                                    Forgot password?
                                </Text>
                            </TouchableOpacity>

                            {/* Button */}
                            {loading ? (
                                <ActivityIndicator size="small" color="#00ffff" />
                            ) : (
                                <Animated.View entering={FadeInUp.delay(300).duration(700)}>
                                <Animated.View style={buttonAnimatedStyle}>
                                    <TouchableOpacity activeOpacity={0.9} onPress={handleSignIn}>
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
                                                Sign In
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                                </Animated.View>
                            )}

                            {/* Sign Up Link */}
                            <Animated.View entering={FadeIn.delay(500).duration(900)}>
                                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                                    <Text style={{ fontSize: 14, color: '#ffffff66', alignSelf: 'center', marginTop: 32 }}>
                                        Don't have an account?{' '}
                                        <Text style={{ color: '#00ffff' }}>Sign Up</Text>
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* Back */}
                            <Animated.View entering={FadeIn.delay(500).duration(900)}>
                                <TouchableOpacity onPress={() => navigation.goBack()}>
                                    <Text style={{ fontSize: 14, color: '#ffffff66', alignSelf: 'center', marginTop: 16 }}>
                                        Go Back
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </Animated.View>
                        </Animated.View>

                        <StatusBar style="light" backgroundColor="transparent" />
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient>
        </TouchableWithoutFeedback>
    );
};

export default EmailSignIn;