/**
 * Shared auth screen input components.
 * Place at: src/components/common/AuthInput.tsx
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, TextInputProps } from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';

import { fields } from '../../theme/fields';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Shared field styles (mirrors authStyles inputfield overrides)
// ---------------------------------------------------------------------------

const fieldStyles = StyleSheet.create({
    wrapper: {
        marginBottom: 20,
    },
    label: {
        fontSize: fontSizes.small,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    inputRow: {
        ...fields.box,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputRowFocused: {
        ...fields.boxFocused,
    },
    input: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: fontSizes.body,
        paddingVertical: 14,
        includeFontPadding: false,
    },
    eyeBtn: {
        paddingLeft: 10,
        paddingVertical: 4,
    },
});

// ---------------------------------------------------------------------------
// TextFieldProps
// ---------------------------------------------------------------------------

type TextFieldProps = TextInputProps & {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    mb?: number; // override marginBottom
};

// Plain text field
export const TextField = ({ label, value, onChangeText, mb, ...rest }: TextFieldProps) => {
    const [focused, setFocused] = useState(false);
    return (
        <View style={[fieldStyles.wrapper, mb !== undefined && { marginBottom: mb }]}>
            <Text style={fieldStyles.label}>{label}</Text>
            <View style={[fieldStyles.inputRow, focused && fieldStyles.inputRowFocused]}>
                <TextInput
                    style={fieldStyles.input}
                    value={value}
                    onChangeText={onChangeText}
                    accessibilityLabel={label}
                    placeholderTextColor={colors.textSecondary}
                    selectionColor={colors.accent}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    {...rest}
                />
            </View>
        </View>
    );
};

// Password field with show/hide toggle
export const PasswordField = ({ label, value, onChangeText, mb, ...rest }: TextFieldProps) => {
    const [visible, setVisible] = useState(false);
    const [focused, setFocused]  = useState(false);
    return (
        <View style={[fieldStyles.wrapper, mb !== undefined && { marginBottom: mb }]}>
            <Text style={fieldStyles.label}>{label}</Text>
            <View style={[fieldStyles.inputRow, focused && fieldStyles.inputRowFocused]}>
                <TextInput
                    style={fieldStyles.input}
                    value={value}
                    onChangeText={onChangeText}
                    accessibilityLabel={label}
                    placeholderTextColor={colors.textSecondary}
                    selectionColor={colors.accent}
                    secureTextEntry={!visible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    {...rest}
                />
                <TouchableOpacity
                    onPress={() => setVisible(v => !v)}
                    style={fieldStyles.eyeBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    accessibilityRole="button"
                    accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
                >
                    <FontAwesome5
                        iconStyle="solid"
                        name={visible ? 'eye' : 'eye-slash'}
                        size={iconSize.sm}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};