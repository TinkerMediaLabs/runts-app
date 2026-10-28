import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/common/AppText';
import Animated, { FadeInDown, Layout, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

// A selectable genre tile (onboarding and the edit-your-genres screen).

const GenreChip = ({
    name,
    color,
    icon,
    selected,
    onPress,
    delay,
}: any) => {

    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(scale.value, { damping: 12, stiffness: 180 }) }],
    }));

    const baseColor  = color ?? colors.accent;
    const bgColor    = selected ? baseColor : 'rgba(255,255,255,0.05)';
    const borderColor = selected ? baseColor : 'rgba(255,255,255,0.1)';
    const textColor  = selected ? '#000' : '#ffffffb0';
    const iconColor  = selected ? '#000' : baseColor;

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).springify()}
            layout={Layout.springify()}
            style={[styles.chipWrapper, animatedStyle]}
        >
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={onPress}
                accessibilityRole="checkbox"
                accessibilityLabel={name}
                accessibilityState={{ checked: !!selected }}
                onPressIn={() => { scale.value = 0.95; }}
                onPressOut={() => { scale.value = selected ? 1.03 : 1; }}
                style={[styles.chip, { backgroundColor: bgColor, borderColor }]}
            >
                {icon && (
                    <FontAwesome5
                        name={icon as any}
                        size={iconSize.sm}
                        color={iconColor}
                        iconStyle="solid"
                        style={{ marginBottom: 6 }}
                    />
                )}
                <Text style={[styles.chipText, { color: textColor }]}>{name}</Text>
                {selected && (
                    <View style={styles.chipCheck}>
                        <FontAwesome5 name="check" size={8} color={colors.textOnAccent} iconStyle="solid" />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

export default GenreChip;

const styles = StyleSheet.create({
    chipWrapper: {
        width: '47%',
    },

    chip: {
        borderWidth: 1,
        borderRadius: radius.lg,
        paddingVertical: 18,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
        position: 'relative',
    },

    chipText: {
        fontSize: fontSizes.small,
        fontWeight: '600',
        textAlign: 'center',
        textTransform: 'capitalize',
    },

    chipCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
