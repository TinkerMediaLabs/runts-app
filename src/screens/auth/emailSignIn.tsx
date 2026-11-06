import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Dimensions, ActivityIndicator, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, ScrollView, Platform, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import useStyles from '../../theme/authStyles';
import Button from '@/components/common/Button';
import { TextField, PasswordField } from '../../components/common/AuthInput';
import { loginUser } from '../../services/auth';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';

const { width, height } = Dimensions.get('window');

const EmailSignIn = ({ navigation }: any) => {
    const styles = useStyles();
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');

    const opacity    = useSharedValue(0);
    const translateY = useSharedValue(30);
    const btnScale   = useSharedValue(1);

    useEffect(() => {
        opacity.value    = withTiming(1, { duration: 700 });
        translateY.value = withSpring(0, { damping: 14, stiffness: 120 });
    }, []);

    // Each animated style touches only ONE property so neither node
    // mixes opacity + transform (which triggers the layout animation warning),
    // and useAnimatedStyle ensures .value is never read during React render.
    const opacityStyle    = useAnimatedStyle(() => ({ opacity: opacity.value }));
    const translateYStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const buttonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

    const handleSignIn = async () => {
        if (!email.trim() || !password.trim()) { setError('Please enter your email and password.'); return; }
        setLoading(true); setError('');
        btnScale.value = withSequence(withTiming(0.96, { duration: 100 }), withSpring(1));
        try {
            await loginUser(email.replace(/ /g, ''), password);
       } catch (err: any) {
            if (err?.name === 'UserNotConfirmedException') {
                navigation.navigate('ConfirmEmail', { email: email.replace(/ /g, '') });
            } else {
                setError(err?.message || 'Error signing in. Please try again.');
            }
        }
                setLoading(false);
            };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessibilityRole="none">
            <LinearGradient colors={['#000000', '#050505', '#0a0a0a']} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <StatusBar style="light" backgroundColor="transparent" />
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                        {/* Outer: opacity only */}
                        <Animated.View style={opacityStyle}>
                        {/* Inner: translateY only — keeps transform off the node that owns entering children */}
                        <Animated.View style={translateYStyle}>

                            <Text style={[styles.title, s.heading]}>Sign In</Text>

                            {error ? <Animated.View entering={FadeIn.duration(250)} style={s.errorBox} accessibilityRole="alert" accessibilityLiveRegion="assertive"><Text style={s.errorText}>{error}</Text></Animated.View> : null}

                            <Animated.View entering={FadeInUp.delay(150).duration(700)}>
                                <TextField label="Email" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                            </Animated.View>

                            <Animated.View entering={FadeInUp.delay(200).duration(700)}>
                                <PasswordField label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" mb={8} />
                            </Animated.View>

                            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Forgot password" onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginBottom: 32 }}>
                                <Text style={s.forgotText}>Forgot password?</Text>
                            </TouchableOpacity>

                            {loading ? <ActivityIndicator size="small" color={colors.accent} /> : (
                                <Animated.View entering={FadeInUp.delay(300).duration(700)}>
                                <Animated.View style={buttonAnimatedStyle}>
                                    <Button label="Sign In" onPress={handleSignIn} glow style={s.button} />
                                </Animated.View>
                                </Animated.View>
                            )}

                            <Animated.View entering={FadeIn.delay(500).duration(900)}>
                                <TouchableOpacity onPress={() => navigation.navigate('SignUp')} accessibilityRole="button" accessibilityLabel="Don't have an account? Sign up">
                                    <Text style={s.linkText}>Don't have an account? <Text style={s.linkAccent}>Sign Up</Text></Text>
                                </TouchableOpacity>
                            </Animated.View>
                            <Animated.View entering={FadeIn.delay(550).duration(900)}>
                                <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
                                    <Text style={s.backText}>Go Back</Text>
                                </TouchableOpacity>
                            </Animated.View>

                        </Animated.View>
                        </Animated.View>

                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </TouchableWithoutFeedback>
    );
};

const s = StyleSheet.create({
    scroll:      { minHeight: height, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
    heading:     { fontSize: fontSizes.display, marginBottom: 32 },
    errorBox:    { backgroundColor: '#ff444415', borderWidth: 1, borderColor: '#ff444440', borderRadius: radius.lg, padding: 14, marginBottom: 24 },
    errorText:   { color: '#ff8a8a', fontSize: fontSizes.small, textAlign: 'center' },
    button:     { alignSelf: 'center', width: width * 0.86 },
    linkText:    { fontSize: fontSizes.small, color: colors.textSecondary, alignSelf: 'center', marginTop: 28 },
    linkAccent:  { color: colors.accent },
    backText:    { fontSize: fontSizes.small, color: colors.textSecondary, alignSelf: 'center', marginTop: 14 },
    forgotText:  { color: 'rgba(0,255,255,0.6)', fontSize: fontSizes.small },
});

export default EmailSignIn;