import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Text } from '@/components/common/AppText';

import Screen from "@/components/common/Screen";
import useStyles from "@/theme/styles";
import { format } from "date-fns";

import DateTimePickerModal from "react-native-modal-datetime-picker";
import DateTimePicker from '@react-native-community/datetimepicker';

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
import { isOldEnough, MIN_AGE } from '@/lib/age';

const SCREEN_HEIGHT = Dimensions.get("window").height;

const Welcome = ({ navigation }: any) => {
    const styles = useStyles();

    const [date, setDate] = useState(new Date());
    const [isPickerVisible, setPickerVisible] = useState(false);
    const { logout } = useApp();
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

    // -----------------------
    // DATE PICKER
    // -----------------------
   const onConfirmDate = (selectedDate: Date) => {
        setTimeout(() => {
            setPickerVisible(false);
            setDate(selectedDate);
        }, 100);
    };

    return (
        <Screen>
            <View style={[styles.container, { flex: 1, justifyContent: "space-between" }]}>

                {/* CENTER CONTENT */}
                <View style={{ alignItems: "center", marginTop: SCREEN_HEIGHT * 0.15 }}>

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

                        <Text style={{ color: "#aaa", fontSize: fontSizes.body, marginTop: 10, textAlign: "center" }}>
                            Your home for audio short stories
                        </Text>
                    </Animated.View>
                    </Animated.View>

                    {/* DIVIDER */}
                    <View style={{ width: "60%", height: 1, backgroundColor: colors.surface3, marginVertical: 30 }} />

                    {/* BIRTHDATE */}
                    <Text style={{ color: colors.textPrimary, fontSize: fontSizes.body, textAlign: "center" }}>
                        Select your birthdate to continue
                    </Text>
                    <Text style={{ color: "#ffffff99", fontSize: fontSizes.small, textAlign: "center", marginTop: 8, paddingHorizontal: 30, lineHeight: 18 }}>
                        We ask for your birthdate to confirm you're 18 or older before showing mature content. It's private and never shown to other listeners.
                    </Text>

                    <TouchableOpacity
                        onPress={() => setPickerVisible(true)}
                        accessibilityRole="button"
                        accessibilityLabel={`Birthdate, ${format(date, "MMMM do, yyyy")}`}
                        accessibilityHint="Opens date picker"
                        style={{
                            marginTop: 15,
                            paddingVertical: 12,
                            paddingHorizontal: 20,
                            borderRadius: radius.md,
                            backgroundColor: colors.surface2,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Text style={{ color: colors.textPrimary, fontSize: fontSizes.body }}>
                            {format(date, "MMMM do, yyyy")}
                        </Text>
                    </TouchableOpacity>

                    {tooYoung ? (
                        <View accessibilityLiveRegion="polite" style={{ marginTop: 20, paddingHorizontal: 30, alignItems: 'center' }}>
                            <Text style={{ color: colors.textPrimary, fontSize: fontSizes.body, textAlign: 'center', lineHeight: 22 }}>
                                Runts is for listeners {MIN_AGE} and older, so we can't create your account.
                            </Text>
                            {removeError ? (
                                <Text style={{ color: '#ff6b6b', fontSize: fontSizes.small, textAlign: 'center', marginTop: 8 }}>{removeError}</Text>
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
                </View>

                {/* FOOTER CTA */}
                <Animated.View style={[{ paddingBottom: 40 }, buttonOpacityStyle]}>
                <Animated.View style={buttonScaleStyle}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Next"
                        onPress={() => {
                            const birthdate = format(date, 'yyyy-MM-dd');
                            if (!isOldEnough(birthdate)) { setTooYoung(true); return; }
                            navigation.navigate('WelcomePref', { birthdate });
                        }}
                        style={{
                            backgroundColor: "#00C2C2",
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

                {/* DATE PICKER */}
               {isPickerVisible && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                            setPickerVisible(false);
                            if (event.type === 'set' && selectedDate) {
                                setTimeout(() => setDate(selectedDate), 100);
                            }
                        }}
                        themeVariant="dark"
                        maximumDate={new Date()}
                    />
                )}
            </View>
        </Screen>
    );
};

export default Welcome;