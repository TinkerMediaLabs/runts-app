import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Dimensions, ActivityIndicator, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';

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
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { StatusBar } from 'expo-status-bar';
import useStyles from '../../theme/authStyles';
import { confirmNewPassword } from '../../services/auth';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

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
        <View style={[styles.inputfield, { borderRadius: radius.xl, backgroundColor: colors.surface2, borderColor: colors.borderSubtle, justifyContent: 'center' }]} />
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessibilityRole="none">
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
                                <Text style={[styles.title, { fontSize: fontSizes.display, marginBottom: 12 }]}>
                                    New Password
                                </Text>
                                <Text style={[styles.paragraph, { color: colors.textSecondary, lineHeight: 22, marginBottom: 40 }]}>
                                    Enter the code sent to{' '}
                                    <Text style={{ color: colors.accent }}>{email}</Text>
                                    {' '}and your new password.
                                </Text>
                            </Animated.View>

                            {/* Error */}
                            {error ? (
                                <Animated.View
                                    entering={FadeIn.duration(250)}
                                    accessibilityRole="alert"
                                    accessibilityLiveRegion="assertive"
                                    style={{ backgroundColor: '#ff444415', borderWidth: 1, borderColor: '#ff444440', borderRadius: radius.xl, padding: 14, marginBottom: 24 }}
                                >
                                    <Text style={{ color: '#ff8a8a', fontSize: fontSizes.small, textAlign: 'center' }}>{error}</Text>
                                </Animated.View>
                            ) : null}

                            {/* Code */}
                            <Animated.View entering={FadeInUp.delay(150).duration(700)}>
                                <Text style={[styles.title, { marginBottom: 8, marginHorizontal: 0, fontSize: fontSizes.small }]}>Reset Code</Text>
                                <View style={[styles.inputfield, { borderRadius: radius.xl, backgroundColor: colors.surface2, borderColor: colors.borderSubtle, justifyContent: 'center', marginBottom: 20 }]}>
                                    <TextInput
                                        accessibilityLabel="Reset code"
                                        placeholder="Enter your code"
                                        placeholderTextColor={colors.textSecondary}
                                        style={[styles.textInputTitle, { fontSize: fontSizes.body, color: colors.textPrimary }]}
                                        maxLength={6}
                                        keyboardType="number-pad"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        selectionColor={colors.accent}
                                        cursorColor={colors.accent}
                                        value={code}
                                        onChangeText={setCode}
                                    />
                                </View>
                            </Animated.View>

                            {/* New Password */}
                            <Animated.View entering={FadeInUp.delay(200).duration(700)}>
                                <Text style={[styles.title, { marginBottom: 8, marginHorizontal: 0, fontSize: fontSizes.small }]}>New Password</Text>
                                <View style={[styles.inputfield, { borderRadius: radius.xl, backgroundColor: colors.surface2, borderColor: colors.borderSubtle, flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingRight: 14 }]}>
                                    <TextInput
                                        accessibilityLabel="New password"
                                        placeholder="At least 8 characters"
                                        placeholderTextColor={colors.textSecondary}
                                        style={[styles.textInputTitle, { flex: 1, fontSize: fontSizes.body, color: colors.textPrimary }]}
                                        maxLength={40}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        secureTextEntry={!showNew}
                                        selectionColor={colors.accent}
                                        cursorColor={colors.accent}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                    />
                                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={showNew ? 'Hide new password' : 'Show new password'} onPress={() => setShowNew(v => !v)} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
                                        <FontAwesome5
                                            iconStyle="solid"
                                            name={showNew ? 'eye' : 'eye-slash'}
                                            size={iconSize.sm}
                                            color={colors.textTertiary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            {/* Confirm Password */}
                            <Animated.View entering={FadeInUp.delay(250).duration(700)}>
                                <Text style={[styles.title, { marginBottom: 8, marginHorizontal: 0, fontSize: fontSizes.small }]}>Confirm Password</Text>
                                <View style={[styles.inputfield, { borderRadius: radius.xl, backgroundColor: colors.surface2, borderColor: colors.borderSubtle, flexDirection: 'row', alignItems: 'center', marginBottom: 32, paddingRight: 14 }]}>
                                    <TextInput
                                        accessibilityLabel="Confirm new password"
                                        placeholder="Re-enter your new password"
                                        placeholderTextColor={colors.textSecondary}
                                        style={[styles.textInputTitle, { flex: 1, fontSize: fontSizes.body, color: colors.textPrimary }]}
                                        maxLength={40}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        secureTextEntry={!showConfirm}
                                        selectionColor={colors.accent}
                                        cursorColor={colors.accent}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'} onPress={() => setShowConfirm(v => !v)} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
                                        <FontAwesome5
                                            iconStyle="solid"
                                            name={showConfirm ? 'eye' : 'eye-slash'}
                                            size={iconSize.sm}
                                            color={colors.textTertiary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            {/* Button */}
                            {loading ? (
                                <ActivityIndicator size="small" color={colors.accent} />
                            ) : (
                                <Animated.View entering={FadeInUp.delay(300).duration(700)}>
                                <Animated.View style={buttonAnimatedStyle}>
                                    <TouchableOpacity accessibilityRole="button" activeOpacity={0.9} onPress={handleConfirm}>
                                        <View style={[styles.buttonlayout, { alignSelf: 'center', width: width * 0.86, borderRadius: radius.xl, backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 18 }]}>
                                            <Text style={[styles.buttontext, { width: '100%', fontSize: fontSizes.body, fontWeight: '700' }]}>
                                                Reset Password
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                                </Animated.View>
                            )}

                            {/* Back */}
                            <Animated.View entering={FadeIn.delay(500).duration(900)}>
                                <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()}>
                                    <Text style={{ fontSize: fontSizes.small, color: colors.textSecondary, alignSelf: 'center', marginTop: 32 }}>
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