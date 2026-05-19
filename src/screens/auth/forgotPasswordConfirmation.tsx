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
    ScrollView,
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
import Feather from '@react-native-vector-icons/feather';
import { StatusBar } from 'expo-status-bar';
import useStyles from '../../theme/authStyles';
import { confirmNewPassword } from '../../services/auth';

const { width, height } = Dimensions.get('window');

const ForgotPasswordConfirmation = ({ navigation, route }: any) => {
    const styles = useStyles();
    const email = route?.params?.email ?? '';

    const [code, setCode]                       = useState('');
    const [newPassword, setNewPassword]         = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading]                 = useState(false);
    const [error, setError]                     = useState('');
    const [showNew, setShowNew]                 = useState(false);
    const [showConfirm, setShowConfirm]         = useState(false);

    const contentOpacity     = useSharedValue(0);
    const contentTranslateY  = useSharedValue(30);
    const buttonScale        = useSharedValue(1);

    useEffect(() => {
        contentOpacity.value    = withTiming(1, { duration: 700 });
        contentTranslateY.value = withSpring(0, { damping: 14, stiffness: 120 });
    }, []);

    const opacityStyle        = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
    const translateYStyle     = useAnimatedStyle(() => ({ transform: [{ translateY: contentTranslateY.value }] }));
    const buttonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));

    const handleConfirm = async () => {
        if (!code.trim() || !newPassword.trim()) {
            setError('Please fill in all fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        setLoading(true);
        setError('');
        buttonScale.value = withSequence(withTiming(0.96, { duration: 100 }), withSpring(1));
        try {
            await confirmNewPassword(email, code.trim(), newPassword);
            navigation.navigate('EmailSignIn');
        } catch (err: any) {
            console.log(err);
            setError(err?.message || 'Error resetting password. Please try again.');
        }
        setLoading(false);
    };

    const inputField = (
        <View style={[styles.inputfield, { borderRadius: 18, backgroundColor: '#1a1a1a', borderColor: '#ffffff10', justifyContent: 'center' }]} />
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <LinearGradient
                colors={['#000000', '#050505', '#0a0a0a']}
                style={{ flex: 1 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <StatusBar style="light" backgroundColor="transparent" />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={{ minHeight: height, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Outer: opacity only */}
                        <Animated.View style={opacityStyle}>
                        {/* Inner: translateY only */}
                        <Animated.View style={translateYStyle}>

                            {/* Header */}
                            <Animated.View entering={FadeInDown.duration(700)}>
                                <Text style={[styles.title, { fontSize: 34, marginBottom: 12 }]}>
                                    New Password
                                </Text>
                                <Text style={[styles.paragraph, { color: '#ffffff88', lineHeight: 22, marginBottom: 40 }]}>
                                    Enter the code sent to{' '}
                                    <Text style={{ color: '#00ffff' }}>{email}</Text>
                                    {' '}and your new password.
                                </Text>
                            </Animated.View>

                            {/* Error */}
                            {error ? (
                                <Animated.View
                                    entering={FadeIn.duration(250)}
                                    style={{ backgroundColor: '#ff444415', borderWidth: 1, borderColor: '#ff444440', borderRadius: 18, padding: 14, marginBottom: 24 }}
                                >
                                    <Text style={{ color: '#ff8a8a', fontSize: 13, textAlign: 'center' }}>{error}</Text>
                                </Animated.View>
                            ) : null}

                            {/* Code */}
                            <Animated.View entering={FadeInUp.delay(150).duration(700)}>
                                <Text style={[styles.title, { marginBottom: 8, marginHorizontal: 0, fontSize: 14 }]}>Reset Code</Text>
                                <View style={[styles.inputfield, { borderRadius: 18, backgroundColor: '#1a1a1a', borderColor: '#ffffff10', justifyContent: 'center', marginBottom: 20 }]}>
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

                            {/* New Password */}
                            <Animated.View entering={FadeInUp.delay(200).duration(700)}>
                                <Text style={[styles.title, { marginBottom: 8, marginHorizontal: 0, fontSize: 14 }]}>New Password</Text>
                                <View style={[styles.inputfield, { borderRadius: 18, backgroundColor: '#1a1a1a', borderColor: '#ffffff10', flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingRight: 14 }]}>
                                    <TextInput
                                        placeholder="At least 8 characters"
                                        placeholderTextColor="#ffffff55"
                                        style={[styles.textInputTitle, { flex: 1, fontSize: 16, color: '#fff' }]}
                                        maxLength={40}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        secureTextEntry={!showNew}
                                        selectionColor="#00ffff"
                                        cursorColor="#00ffff"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowNew(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Feather
                                            name={showNew ? 'eye' : 'eye-off'}
                                            size={18}
                                            color="rgba(255,255,255,0.45)"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            {/* Confirm Password */}
                            <Animated.View entering={FadeInUp.delay(250).duration(700)}>
                                <Text style={[styles.title, { marginBottom: 8, marginHorizontal: 0, fontSize: 14 }]}>Confirm Password</Text>
                                <View style={[styles.inputfield, { borderRadius: 18, backgroundColor: '#1a1a1a', borderColor: '#ffffff10', flexDirection: 'row', alignItems: 'center', marginBottom: 32, paddingRight: 14 }]}>
                                    <TextInput
                                        placeholder="Re-enter your new password"
                                        placeholderTextColor="#ffffff55"
                                        style={[styles.textInputTitle, { flex: 1, fontSize: 16, color: '#fff' }]}
                                        maxLength={40}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        secureTextEntry={!showConfirm}
                                        selectionColor="#00ffff"
                                        cursorColor="#00ffff"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirm(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Feather
                                            name={showConfirm ? 'eye' : 'eye-off'}
                                            size={18}
                                            color="rgba(255,255,255,0.45)"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            {/* Button */}
                            {loading ? (
                                <ActivityIndicator size="small" color="#00ffff" />
                            ) : (
                                <Animated.View entering={FadeInUp.delay(300).duration(700)}>
                                <Animated.View style={buttonAnimatedStyle}>
                                    <TouchableOpacity activeOpacity={0.9} onPress={handleConfirm}>
                                        <View style={[styles.buttonlayout, { alignSelf: 'center', width: width * 0.86, borderRadius: 22, backgroundColor: '#00ffff', shadowColor: '#00ffff', shadowOpacity: 0.3, shadowRadius: 18 }]}>
                                            <Text style={[styles.buttontext, { width: '100%', fontSize: 16, fontWeight: '700' }]}>
                                                Reset Password
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                                </Animated.View>
                            )}

                            {/* Back */}
                            <Animated.View entering={FadeIn.delay(500).duration(900)}>
                                <TouchableOpacity onPress={() => navigation.goBack()}>
                                    <Text style={{ fontSize: 14, color: '#ffffff66', alignSelf: 'center', marginTop: 32 }}>
                                        Go Back
                                    </Text>
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

export default ForgotPasswordConfirmation;