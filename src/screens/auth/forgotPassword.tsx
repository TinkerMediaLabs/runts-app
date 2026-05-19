import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, ScrollView, Platform, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import useStyles from '../../theme/authStyles';
import { TextField } from '../../components/common/AuthInput';
import { sendPasswordResetCode } from '../../services/auth';

const { width, height } = Dimensions.get('window');

const ForgotPassword = ({ navigation }: any) => {
    const styles = useStyles();
    const [email, setEmail]     = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

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

    const handleForgotPassword = async () => {
        if (!email.trim()) { setError('Please enter your email address.'); return; }
        setLoading(true); setError('');
        btnScale.value = withSequence(withTiming(0.96, { duration: 100 }), withSpring(1));
        try {
            await sendPasswordResetCode(email.replace(/ /g, ''));
            navigation.navigate('ForgotPasswordCon', { email: email.replace(/ /g, '') });
        } catch (err: any) {
            setError(err?.message || 'Error sending reset code. Please try again.');
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
                        {/* Inner: translateY only */}
                        <Animated.View style={translateYStyle}>

                            <Animated.View entering={FadeInDown.duration(700)}>
                                <Text style={[styles.title, s.heading]}>Reset Password</Text>
                                <Text style={s.subText}>Enter the email associated with your account and we'll send you a reset code.</Text>
                            </Animated.View>

                            {error ? <Animated.View entering={FadeIn.duration(250)} style={s.errorBox}><Text style={s.errorText}>{error}</Text></Animated.View> : null}

                            <Animated.View entering={FadeInUp.delay(150).duration(700)}>
                                <TextField label="Email" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} mb={32} />
                            </Animated.View>

                            {loading ? <ActivityIndicator size="small" color="#00ffff" /> : (
                                <Animated.View entering={FadeInUp.delay(300).duration(700)}>
                                <Animated.View style={buttonAnimatedStyle}>
                                    <TouchableOpacity activeOpacity={0.9} onPress={handleForgotPassword}>
                                        <View style={[styles.buttonlayout, s.button]}><Text style={[styles.buttontext, s.buttonText]}>Send Reset Code</Text></View>
                                    </TouchableOpacity>
                                </Animated.View>
                                </Animated.View>
                            )}

                            <Animated.View entering={FadeIn.delay(500).duration(900)}>
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
    heading:    { fontSize: 34, marginBottom: 12 },
    subText:    { fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 22, marginBottom: 36 },
    errorBox:   { backgroundColor: '#ff444415', borderWidth: 1, borderColor: '#ff444440', borderRadius: 14, padding: 14, marginBottom: 24 },
    errorText:  { color: '#ff8a8a', fontSize: 13, textAlign: 'center' },
    button:     { alignSelf: 'center', width: width * 0.86, borderRadius: 22, backgroundColor: '#00ffff', shadowColor: '#00ffff', shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
    buttonText: { width: '100%', fontSize: 16, fontWeight: '700' },
    backText:   { fontSize: 14, color: 'rgba(255,255,255,0.35)', alignSelf: 'center', marginTop: 32 },
});

export default ForgotPassword;