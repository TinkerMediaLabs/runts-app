import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Modal, StyleSheet, Linking, AccessibilityInfo, Animated, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';
import { useApp } from '@/context/AppContext';
import { pinErrorMessage } from '@/lib/eroticPin';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';

const { width } = Dimensions.get('window');
const SUPPORT_EMAIL = 'mailto:admin@tinkermedia.net';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
    visible:   boolean;
    onSuccess: () => void;   // called after correct PIN — parent closes modal
    onCancel:  () => void;
    // 'unlock' (default): unlocks the erotic settings for this session.
    // 'remove': a correct PIN removes the PIN lock from the account.
    mode?:     'unlock' | 'remove';
};

// ---------------------------------------------------------------------------
// PIN dots
// ---------------------------------------------------------------------------

const PINDots = ({ length }: { length: number }) => (
    <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map(i => (
            <View
                key={i}
                style={[styles.dot, i < length && styles.dotFilled]}
            />
        ))}
    </View>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PINEntryModal = ({ visible, onSuccess, onCancel, mode = 'unlock' }: Props) => {
    const { verifyEroticPin, removeEroticPin, unlockEroticForSession } = useApp();

    const [pin,   setPin]   = useState('');
    const [error, setError] = useState('');
    const [busy,  setBusy]  = useState(false);

    const inputRef   = useRef<TextInput>(null);
    const shakeAnim  = useRef(new Animated.Value(0)).current;

    // Focus hidden input when modal opens
    useEffect(() => {
        if (visible) {
            setPin('');
            setError('');
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [visible]);

    const reduceMotion = useReduceMotion();

    // Read validation errors aloud (the error text appears without any focus change).
    useEffect(() => {
        if (error) AccessibilityInfo.announceForAccessibility(error);
    }, [error]);

    const shake = () => {
        if (reduceMotion) return;
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6,   duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6,  duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const handleChange = async (value: string) => {
        if (busy) return;

        // Only allow digits
        const digits = value.replace(/\D/g, '').slice(0, 4);
        setPin(digits);
        setError('');

        if (digits.length === 4) {
            setBusy(true);
            const result = mode === 'remove'
                ? await removeEroticPin(digits)
                : await verifyEroticPin(digits);
            setBusy(false);

            if (result.ok) {
                if (mode === 'unlock') unlockEroticForSession();
                setPin('');
                onSuccess();
            } else {
                shake();
                setError(pinErrorMessage(result));
                setPin('');
                setTimeout(() => inputRef.current?.focus(), 50);
            }
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <KeyboardAvoidingView
                style={styles.backdrop}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableOpacity
                    accessibilityRole="button" accessibilityLabel="Cancel"
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onCancel}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                />

                <Animated.View
                    style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
                >
                    <Text style={styles.title}>Enter PIN</Text>
                    <Text style={styles.subtitle}>
                        {mode === 'remove'
                            ? 'Enter your PIN to remove the lock.'
                            : 'Enter your PIN to access erotic content settings.'}
                    </Text>

                    {/* Tapping the dot area re-focuses the hidden input */}
                    <TouchableOpacity
                        accessibilityRole="none"
                        activeOpacity={1}
                        onPress={() => inputRef.current?.focus()}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                    >
                        <PINDots length={pin.length} />
                    </TouchableOpacity>

                    {/* Hidden text input captures keystrokes */}
                    <TextInput
                        ref={inputRef}
                        value={pin}
                        onChangeText={handleChange}
                        keyboardType="number-pad"
                        maxLength={4}
                        style={styles.hiddenInput}
                        caretHidden
                        contextMenuHidden
                        secureTextEntry
                        accessibilityLabel={mode === 'remove' ? 'Enter your 4-digit PIN to remove the lock' : 'Enter your 4-digit PIN'}
                    />

                    {!!error && (
                        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
                            {error}
                        </Text>
                    )}

                    <TouchableOpacity
                        onPress={() => Linking.openURL(SUPPORT_EMAIL)}
                        style={styles.forgotButton}
                        accessibilityRole="link"
                        accessibilityLabel="Forgot PIN? Contact support"
                        activeOpacity={0.7}
                    >
                        <Text style={styles.forgotText}>Forgot PIN? Contact support</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onCancel}
                        style={styles.cancelButton}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel"
                        activeOpacity={0.7}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    backdrop: {
        flex:            1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent:  'center',
        alignItems:      'center',
        padding:         24,
    },
    card: {
        backgroundColor: colors.surface1,
        borderRadius:    radius.xl,
        borderWidth:     1,
        borderColor:     colors.border,
        padding:         32,
        width:           width * 0.85,
        alignItems:      'center',
    },
    title: {
        color:        colors.textPrimary,
        fontSize:     fontSizes.title,
        fontWeight:   '700',
        marginBottom: 8,
    },
    subtitle: {
        color:        colors.textSecondary,
        fontSize:     fontSizes.small,
        textAlign:    'center',
        marginBottom: 32,
        lineHeight:   20,
    },
    dotsRow: {
        flexDirection: 'row',
        gap:           20,
        marginBottom:  24,
    },
    dot: {
        width:           18,
        height:          18,
        borderRadius:    9,
        borderWidth:     2,
        borderColor:     colors.border,
        backgroundColor: 'transparent',
    },
    dotFilled: {
        backgroundColor: colors.accent,
        borderColor:     colors.accent,
    },
    hiddenInput: {
        position: 'absolute',
        opacity:  0,
        height:   0,
        width:    0,
    },
    error: {
        color:        colors.danger,
        fontSize:     fontSizes.small,
        marginBottom: 16,
        textAlign:    'center',
    },
    forgotButton: {
        marginBottom: 12,
        paddingVertical: 8,
    },
    forgotText: {
        color:    colors.textSecondary,
        fontSize: fontSizes.small,
        textDecorationLine: 'underline',
    },
    cancelButton: {
        paddingVertical:   12,
        paddingHorizontal: 32,
        borderRadius:      radius.md,
        backgroundColor:   colors.surface2,
        borderWidth:       1,
        borderColor:       colors.border,
    },
    cancelText: {
        color:      '#aaa',
        fontSize:   fontSizes.body,
        fontWeight: '500',
    },
});

export default PINEntryModal;