import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, ScrollView, Platform, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import useStyles from '../../theme/authStyles';
import { TextField } from '../../components/common/AuthInput';
import { confirmUserEmail, resendCode } from '../../services/auth';

const { width, height } = Dimensions.get('window');

const ConfirmEmail = ({ navigation, route }: any) => {
    const styles   = useStyles();
    const email    = route?.params?.email ?? '';
    const [code, setCode]           = useState('');
    const [loading, setLoading]     = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError]         = useState('');
    const [resentMsg, setResentMsg] = useState('');

    const opacity    = useSharedValue(0);
    const translateY = useSharedValue(30);
    const btnScale   = useSharedValue(1);

    useEffect(() => {
        opacity.value    = withTiming(1, { duration: 700 });
        translateY.value = withSpring(0, { damping: 14, stiffness: 120 });
    }, []);

    const opacityStyle        = useAnimatedStyle(() => ({ opacity: opacity.value }));
    const translateYStyle     = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const buttonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

    const handleConfirm = async () => {
        if (!code.trim()) { setError('Please enter the verification code.'); return; }
        setLoading(true); setError('');
        btnScale.value = withSequence(withTiming(0.96, { duration: 100 }), withSpring(1));
        try {
            await confirmUserEmail(email, code.trim());
            navigation.navigate('EmailSignIn');
        } catch (err: any) {
            setError(err?.message || 'Invalid code. Please try again.');
        }
        setLoading(false);
    };

    const handleResend = async () => {
        setResending(true); setError(''); setResentMsg('');
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
            <LinearGradient colors={['#000000', '#050505', '#0a0a0a']} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <StatusBar style="light" backgroundColor="transparent" />
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                        {/* Outer: opacity only */}
                        <Animated.View style={opacityStyle}>
                        {/* Inner: translateY only */}
                        <Animated.View style={translateYStyle}>

                            <Animated.View entering={FadeInDown.duration(700)}>
                                <Text style={[styles.title, s.heading]}>Verify Email</Text>
                                <Text style={s.subText}>
                                    We sent a code to <Text style={{ color: '#00ffff' }}>{email}</Text>
                                </Text>
                            </Animated.View>

                            {error     ? <Animated.View entering={FadeIn.duration(250)} style={s.errorBox}><Text style={s.errorText}>{error}</Text></Animated.View> : null}
                            {resentMsg ? <Animated.View entering={FadeIn.duration(250)} style={s.successBox}><Text style={s.successText}>{resentMsg}</Text></Animated.View> : null}

                            <Animated.View entering={FadeInUp.delay(150).duration(700)}>
                                <TextField label="Verification Code" value={code} onChangeText={setCode} placeholder="Enter your code" keyboardType="number-pad" autoCapitalize="none" autoCorrect={false} maxLength={6} mb={32} />
                            </Animated.View>

                            {loading ? <ActivityIndicator size="small" color="#00ffff" /> : (
                                <Animated.View entering={FadeInUp.delay(300).duration(700)}>
                                <Animated.View style={buttonAnimatedStyle}>
                                    <TouchableOpacity activeOpacity={0.9} onPress={handleConfirm}>
                                        <View style={[styles.buttonlayout, s.button]}><Text style={[styles.buttontext, s.buttonText]}>Verify Email</Text></View>
                                    </TouchableOpacity>
                                </Animated.View>
                                </Animated.View>
                            )}

                            <Animated.View entering={FadeIn.delay(500).duration(900)}>
                                {resending ? <ActivityIndicator size="small" color="rgba(255,255,255,0.35)" style={{ marginTop: 32 }} /> : (
                                    <TouchableOpacity onPress={handleResend}>
                                        <Text style={s.linkText}>Didn't get a code? <Text style={s.linkAccent}>Resend</Text></Text>
                                    </TouchableOpacity>
                                )}
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
    scroll:      { minHeight: height, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
    heading:     { fontSize: 34, marginBottom: 12 },
    subText:     { fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 22, marginBottom: 36 },
    errorBox:    { backgroundColor: '#ff444415', borderWidth: 1, borderColor: '#ff444440', borderRadius: 14, padding: 14, marginBottom: 24 },
    errorText:   { color: '#ff8a8a', fontSize: 13, textAlign: 'center' },
    successBox:  { backgroundColor: '#00ffff15', borderWidth: 1, borderColor: '#00ffff40', borderRadius: 14, padding: 14, marginBottom: 24 },
    successText: { color: '#00ffff', fontSize: 13, textAlign: 'center' },
    button:      { alignSelf: 'center', width: width * 0.86, borderRadius: 22, backgroundColor: '#00ffff', shadowColor: '#00ffff', shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
    buttonText:  { width: '100%', fontSize: 16, fontWeight: '700' },
    linkText:    { fontSize: 14, color: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginTop: 28 },
    linkAccent:  { color: '#00ffff' },
    backText:    { fontSize: 14, color: 'rgba(255,255,255,0.35)', alignSelf: 'center', marginTop: 14 },
});

export default ConfirmEmail;