/**
 * Shared auth screen input components.
 * Place at: src/components/common/AuthInput.tsx
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    TextInputProps,
} from 'react-native';

import Feather from '@react-native-vector-icons/feather';

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Shared field styles (mirrors authStyles inputfield overrides)
// ---------------------------------------------------------------------------

const fieldStyles = StyleSheet.create({
    wrapper: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.55)',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#ffffff10',
        paddingHorizontal: 18,
        minHeight: 52,
    },
    inputRowFocused: {
        borderColor: 'rgba(0,255,255,0.35)',
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
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
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    selectionColor="#00ffff"
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
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    selectionColor="#00ffff"
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
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Feather
                        name={visible ? 'eye' : 'eye-off'}
                        size={18}
                        color="rgba(255,255,255,0.45)"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};