import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    Dimensions,
} from "react-native";

import Screen from "@/components/common/Screen";
import useStyles from "@/theme/styles";
import { format } from "date-fns";

import DateTimePickerModal from "react-native-modal-datetime-picker";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSpring,
} from "react-native-reanimated";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const Welcome = ({ navigation }: any) => {
    const styles = useStyles();

    const [date, setDate] = useState(new Date());
    const [isPickerVisible, setPickerVisible] = useState(false);

    const isDark = true; // replace with your theme hook

    // -----------------------
    // ANIMATIONS
    // -----------------------
    const logoOpacity = useSharedValue(0);
    const logoTranslateY = useSharedValue(20);

    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(20);

    const buttonScale = useSharedValue(0.9);
    const buttonOpacity = useSharedValue(0);

    useEffect(() => {
        logoOpacity.value = withTiming(1, { duration: 600 });
        logoTranslateY.value = withTiming(0, { duration: 600 });

        textOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
        textTranslateY.value = withDelay(200, withTiming(0, { duration: 600 }));

        buttonOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
        buttonScale.value = withDelay(400, withSpring(1));
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        opacity: logoOpacity.value,
        transform: [{ translateY: logoTranslateY.value }],
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textTranslateY.value }],
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
        transform: [{ scale: buttonScale.value }],
    }));

    // -----------------------
    // DATE PICKER
    // -----------------------
    const onConfirmDate = (selectedDate: Date) => {
        setPickerVisible(false);
        setDate(selectedDate);
    };

    return (
        <Screen>
            <View style={[styles.container, { flex: 1, justifyContent: "space-between" }]}>

                {/* CENTER CONTENT */}
                <View style={{ alignItems: "center", marginTop: SCREEN_HEIGHT * 0.15 }}>

                    {/* LOGO */}
                    <Animated.View style={logoStyle}>
                        <Image
                            source={require("../../../assets/images/icon.png")}
                            style={{ height: 110, width: 110 }}
                        />
                    </Animated.View>

                    {/* TITLE */}
                    <Animated.View style={[{ marginTop: 20 }, textStyle]}>
                        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center" }}>
                            Welcome to Runts
                        </Text>

                        <Text style={{ color: "#aaa", fontSize: 15, marginTop: 10, textAlign: "center" }}>
                            Your home for audio short stories
                        </Text>
                    </Animated.View>

                    {/* DIVIDER */}
                    <View style={{ width: "60%", height: 1, backgroundColor: "#333", marginVertical: 30 }} />

                    {/* BIRTHDATE */}
                    <Text style={{ color: "#fff", fontSize: 16, textAlign: "center" }}>
                        Select your birthdate to continue
                    </Text>

                    <TouchableOpacity
                        onPress={() => setPickerVisible(true)}
                        style={{
                            marginTop: 15,
                            paddingVertical: 12,
                            paddingHorizontal: 20,
                            borderRadius: 12,
                            backgroundColor: "#1c1c1e",
                            borderWidth: 1,
                            borderColor: "#333",
                        }}
                    >
                        <Text style={{ color: "#fff", fontSize: 16 }}>
                            {format(date, "MMMM do, yyyy")}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* FOOTER CTA */}
                <Animated.View style={[{ paddingBottom: 40 }, buttonStyle]}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate("WelcomePref")}
                        style={{
                            backgroundColor: "#00C2C2",
                            paddingVertical: 14,
                            borderRadius: 14,
                            marginHorizontal: 40,
                        }}
                    >
                        <Text style={{ textAlign: "center", fontWeight: "600", color: "#000" }}>
                            Next
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* DATE PICKER */}
                <DateTimePickerModal
                    isVisible={isPickerVisible}
                    mode="date"
                    date={date}
                    onConfirm={onConfirmDate}
                    onCancel={() => setPickerVisible(false)}
                    themeVariant={"dark"}
                    display="spinner"
                    textColor="gray"
                    positiveButton={{label: 'OK', textColor: 'cyan'}}
                    negativeButton={{label: 'Cancel', textColor: '#ffffff'}}
                />
            </View>
        </Screen>
    );
};

export default Welcome;