import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, ScrollView, Platform, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import useStyles from '../../theme/authStyles';
import { TextField, PasswordField } from '../../components/common/AuthInput';
import { registerUser } from '../../services/auth';

const { width, height } = Dimensions.get('window');

const SignUp = ({ navigation }: any) => {
    const styles = useStyles();
    const [email, setEmail]                     = useState('');
    const [password, setPassword]               = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading]                 = useState(false);
    const [error, setError]                     = useState('');

    const opacity    = useSharedValue(0);
    const translateY = useSharedValue(30);
    const btnScale   = useSharedValue(1);

    useEffect(() => {
        opacity.value    = withTiming(1, { duration: 700 });
        translateY.value = withSpring(0, { damping: 14, stiffness: 120 });
    }, []);

    // Split into two styles — one per property — so no single node mixes
    // opacity + transform, which conflicts with children's entering animations.
    const opacityStyle        = useAnimatedStyle(() => ({ opacity: opacity.value }));
    const translateYStyle     = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const buttonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

    const handleSignUp = async () => {
        if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        setLoading(true); setError('');
        btnScale.value = withSequence(withTiming(0.96, { duration: 100 }), withSpring(1));
        try {
            await registerUser(email.replace(/ /g, ''), password);
            navigation.navigate('ConfirmEmail', { email: email.replace(/ /g, '') });
        } catch (err: any) {
            setError(err?.message || 'Error creating account. Please try again.');
        }
        setLoading(false);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <LinearGradient colors={['#000000', '#050505', '#0a0a0a']} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <StatusBar style="light" backgroundColor="transparent" />
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                        {/* Outer: opacity only */}
                        <Animated.View style={opacityStyle}>
                        {/* Inner: translateY only — keeps transform off the node that owns entering children */}
                        <Animated.View style={translateYStyle}>

                            <Animated.View entering={FadeInDown.duration(700)}>
                                <Text style={[styles.title, s.heading]}>Create Account</Text>
                            </Animated.View>

                            {error ? <Animated.View entering={FadeIn.duration(250)} style={s.errorBox}><Text style={s.errorText}>{error}</Text></Animated.View> : null}

                            <Animated.View entering={FadeInUp.delay(150).duration(700)}>
                                <TextField label="Email" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                            </Animated.View>

                            <Animated.View entering={FadeInUp.delay(200).duration(700)}>
                                <PasswordField label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" />
                            </Animated.View>

                            <Animated.View entering={FadeInUp.delay(250).duration(700)}>
                                <PasswordField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter your password" mb={32} />
                            </Animated.View>

                            {loading ? <ActivityIndicator size="small" color="#00ffff" /> : (
                                <Animated.View entering={FadeInUp.delay(300).duration(700)}>
                                <Animated.View style={buttonAnimatedStyle}>
                                    <TouchableOpacity activeOpacity={0.9} onPress={handleSignUp}>
                                        <View style={[styles.buttonlayout, s.button]}><Text style={[styles.buttontext, s.buttonText]}>Create Account</Text></View>
                                    </TouchableOpacity>
                                </Animated.View>
                                </Animated.View>
                            )}

                            <Animated.View entering={FadeIn.delay(500).duration(900)}>
                                <TouchableOpacity onPress={() => navigation.navigate('EmailSignIn')}>
                                    <Text style={s.linkText}>Already have an account? <Text style={s.linkAccent}>Sign In</Text></Text>
                                </TouchableOpacity>
                            </Animated.View>
                            <Animated.View entering={FadeIn.delay(550).duration(900)}>
                                <TouchableOpacity onPress={() => navigation.goBack()}>
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
    scroll:     { minHeight: height, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
    heading:    { fontSize: 34, marginBottom: 32 },
    errorBox:   { backgroundColor: '#ff444415', borderWidth: 1, borderColor: '#ff444440', borderRadius: 14, padding: 14, marginBottom: 24 },
    errorText:  { color: '#ff8a8a', fontSize: 13, textAlign: 'center' },
    button:     { alignSelf: 'center', width: width * 0.86, borderRadius: 22, backgroundColor: '#00ffff', shadowColor: '#00ffff', shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
    buttonText: { width: '100%', fontSize: 16, fontWeight: '700' },
    linkText:   { fontSize: 14, color: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginTop: 28 },
    linkAccent: { color: '#00ffff' },
    backText:   { fontSize: 14, color: 'rgba(255,255,255,0.35)', alignSelf: 'center', marginTop: 14 },
});

export default SignUp;