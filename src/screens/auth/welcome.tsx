import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, Image, Dimensions, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import Screen from "@/components/common/Screen";
import useStyles from "@/theme/styles";

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSpring,
} from "react-native-reanimated";
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { useApp } from '@/context/AppContext';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { unwrap } from '@/lib/amplifyResult';
import { parseAgeInput, isOldEnoughAge, MIN_AGE } from '@/lib/age';
import { TextInput } from '@/components/common/AppTextInput';
import { fields } from '@/theme/fields';

const SCREEN_HEIGHT = Dimensions.get("window").height;

const Welcome = ({ navigation }: any) => {
    const styles = useStyles();

    const { logout, profile } = useApp();
    // Start from the name the sign-in already has (Apple and Google accounts), unless it is only a placeholder.
    const [name, setName] = useState(profile?.name && profile.name !== 'user' ? profile.name : '');
    const [ageText, setAgeText] = useState('');
    const [tried, setTried] = useState(false);
    const [tooYoung, setTooYoung] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState('');

    // Under the minimum age: nothing is saved. The sign-in account that was just created is removed so no data is kept.
    const removeAccount = async () => {
        setRemoving(true);
        setRemoveError('');
        try {
            const client = generateClient<Schema>();
            if (unwrap(await client.mutations.deleteMyAccount(), 'Delete account') !== true) throw new Error('Delete account failed');
            await logout();
        } catch (err) {
            console.warn('Under-age account removal failed:', err);
            setRemoveError('We could not remove the account. Please check your connection and try again.');
        }
        setRemoving(false);
    };

    // -----------------------
    // ANIMATIONS
    // -----------------------
    const logoOpacity    = useSharedValue(0);
    const logoTranslateY = useSharedValue(20);

    const textOpacity    = useSharedValue(0);
    const textTranslateY = useSharedValue(20);

    const buttonScale   = useSharedValue(0.9);
    const buttonOpacity = useSharedValue(0);

    useEffect(() => {
        logoOpacity.value    = withTiming(1, { duration: 600 });
        logoTranslateY.value = withTiming(0, { duration: 600 });

        textOpacity.value    = withDelay(200, withTiming(1, { duration: 600 }));
        textTranslateY.value = withDelay(200, withTiming(0, { duration: 600 }));

        buttonOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
        buttonScale.value   = withDelay(400, withSpring(1));
    }, []);

    // Each style touches ONE property only — no node mixes opacity + transform
    const logoOpacityStyle    = useAnimatedStyle(() => ({ opacity: logoOpacity.value }));
    const logoTransformStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: logoTranslateY.value }] }));

    const textOpacityStyle    = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
    const textTransformStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: textTranslateY.value }] }));

    const buttonOpacityStyle  = useAnimatedStyle(() => ({ opacity: buttonOpacity.value }));
    const buttonScaleStyle    = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));

    const age = parseAgeInput(ageText);
    const nameOk = name.trim().length > 0;

    const onNext = () => {
        setTried(true);
        if (!nameOk || age === null) return;
        if (!isOldEnoughAge(age)) { setTooYoung(true); return; }
        setTooYoung(false);
        navigation.navigate('WelcomePref', { name: name.trim(), age });
    };

    return (
        <Screen>
            <View style={[styles.container, { flex: 1, justifyContent: "space-between" }]}>

                {/* CENTER CONTENT */}
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: "center", paddingTop: SCREEN_HEIGHT * 0.1, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    {/* LOGO */}
                    <Animated.View style={logoOpacityStyle}>
                    <Animated.View style={logoTransformStyle}>
                        <Image
                            source={require("../../../assets/images/icon.png")}
                            style={{ height: 110, width: 110 }}
                        />
                    </Animated.View>
                    </Animated.View>

                    {/* TITLE */}
                    <Animated.View style={[{ marginTop: 20 }, textOpacityStyle]}>
                    <Animated.View style={textTransformStyle}>
                        <Text style={{ color: colors.textPrimary, fontSize: fontSizes.headline, fontWeight: "700", textAlign: "center" }}>
                            Welcome to Runts
                        </Text>

                        <Text style={{ color: colors.grayAA, fontSize: fontSizes.body, marginTop: 10, textAlign: "center" }}>
                            Your home for audio short stories
                        </Text>
                    </Animated.View>
                    </Animated.View>

                    {/* DIVIDER */}
                    <View style={{ width: "60%", height: 1, backgroundColor: colors.surface3, marginVertical: 30 }} />

                    {/* NAME + AGE */}
                    <View style={local.form}>
                        <Text style={local.label}>What should we call you?</Text>
                        <View style={[fields.box, tried && !nameOk && local.boxError]}>
                            <TextInput
                                style={fields.text}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your display name"
                                placeholderTextColor={colors.textSecondary}
                                maxLength={30}
                                autoCapitalize="words"
                                returnKeyType="next"
                                accessibilityLabel="Display name"
                            />
                        </View>

                        <Text style={[local.label, { marginTop: 18 }]}>How old are you?</Text>
                        <View style={[fields.box, tried && age === null && local.boxError]}>
                            <TextInput
                                style={fields.text}
                                value={ageText}
                                onChangeText={t => { setAgeText(t.replace(/[^0-9]/g, '').slice(0, 3)); setTooYoung(false); }}
                                placeholder="Your age"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="number-pad"
                                maxLength={3}
                                returnKeyType="done"
                                onSubmitEditing={onNext}
                                accessibilityLabel="Your age"
                            />
                        </View>
                        {tried && (!nameOk || age === null) ? (
                            <Text style={local.error} accessibilityLiveRegion="polite">
                                {!nameOk ? 'Please enter a name.' : 'Please enter your age as a number.'}
                            </Text>
                        ) : (
                            <Text style={local.note}>
                                Your name shows on comments. We ask your age to keep mature content for adults. Your age is private and never shown to other listeners.
                            </Text>
                        )}
                    </View>

                    {tooYoung ? (
                        <View accessibilityLiveRegion="polite" style={{ marginTop: 20, paddingHorizontal: 30, alignItems: 'center' }}>
                            <Text style={{ color: colors.textPrimary, fontSize: fontSizes.body, textAlign: 'center', lineHeight: 22 }}>
                                Runts is for listeners {MIN_AGE} and older, so we can't create your account.
                            </Text>
                            {removeError ? (
                                <Text style={{ color: colors.danger, fontSize: fontSizes.small, textAlign: 'center', marginTop: 8 }}>{removeError}</Text>
                            ) : null}
                            <TouchableOpacity
                                onPress={removeAccount}
                                disabled={removing}
                                accessibilityRole="button"
                                accessibilityLabel="Remove my account"
                                style={{ marginTop: 14, paddingVertical: 12, paddingHorizontal: 22, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, opacity: removing ? 0.5 : 1 }}
                            >
                                <Text style={{ color: colors.textPrimary, fontSize: fontSizes.body }}>
                                    {removing ? 'Removing…' : 'Remove my account'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </ScrollView>

                {/* FOOTER CTA */}
                <Animated.View style={[{ paddingBottom: 40 }, buttonOpacityStyle]}>
                <Animated.View style={buttonScaleStyle}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Next"
                        onPress={onNext}
                        style={{
                            backgroundColor: colors.teal,
                            paddingVertical: 14,
                            borderRadius: radius.lg,
                            marginHorizontal: 40,
                        }}
                    >
                        <Text style={{ textAlign: "center", fontWeight: "600", color: colors.textOnAccent }}>
                            Next
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
                </Animated.View>

            </View>
        </Screen>
    );
};

const local = StyleSheet.create({
    form: { alignSelf: 'stretch', paddingHorizontal: 30 },
    label: { color: colors.textPrimary, fontSize: fontSizes.body, fontWeight: '600', marginBottom: 8 },
    note: { color: colors.white60, fontSize: fontSizes.small, lineHeight: 18, marginTop: 12 },
    error: { color: colors.danger, fontSize: fontSizes.small, marginTop: 12 },
    boxError: { borderColor: colors.danger },
});

export default Welcome;