import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Linking,
    Animated,
    Dimensions,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { useApp } from '@/context/AppContext';

const { width } = Dimensions.get('window');
const SUPPORT_EMAIL = 'mailto:admin@tinkermedia.net';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
    visible:   boolean;
    onSuccess: () => void;   // called after correct PIN — parent closes modal
    onCancel:  () => void;
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

const PINEntryModal = ({ visible, onSuccess, onCancel }: Props) => {
    const { verifyEroticPin, unlockEroticForSession } = useApp();

    const [pin,   setPin]   = useState('');
    const [error, setError] = useState('');

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

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6,   duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6,  duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const handleChange = async (value: string) => {
        // Only allow digits
        const digits = value.replace(/\D/g, '').slice(0, 4);
        setPin(digits);
        setError('');

        if (digits.length === 4) {
            const correct = await verifyEroticPin(digits);
            if (correct) {
                unlockEroticForSession();
                setPin('');
                onSuccess();
            } else {
                shake();
                setError('Incorrect PIN. Try again.');
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
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onCancel}
                />

                <Animated.View
                    style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
                >
                    <Text style={styles.title}>Enter PIN</Text>
                    <Text style={styles.subtitle}>
                        Enter your PIN to access erotic content settings.
                    </Text>

                    {/* Tapping the dot area re-focuses the hidden input */}
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => inputRef.current?.focus()}
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
                    />

                    {!!error && <Text style={styles.error}>{error}</Text>}

                    <TouchableOpacity
                        onPress={() => Linking.openURL(SUPPORT_EMAIL)}
                        style={styles.forgotButton}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.forgotText}>Forgot PIN? Contact support</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onCancel}
                        style={styles.cancelButton}
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
        backgroundColor: '#111',
        borderRadius:    24,
        borderWidth:     1,
        borderColor:     '#2a2a2a',
        padding:         32,
        width:           width * 0.85,
        alignItems:      'center',
    },
    title: {
        color:        '#fff',
        fontSize:     22,
        fontWeight:   '700',
        marginBottom: 8,
    },
    subtitle: {
        color:        'rgba(255,255,255,0.5)',
        fontSize:     14,
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
        borderColor:     '#444',
        backgroundColor: 'transparent',
    },
    dotFilled: {
        backgroundColor: 'cyan',
        borderColor:     'cyan',
    },
    hiddenInput: {
        position: 'absolute',
        opacity:  0,
        height:   0,
        width:    0,
    },
    error: {
        color:        '#ff6b6b',
        fontSize:     13,
        marginBottom: 16,
        textAlign:    'center',
    },
    forgotButton: {
        marginBottom: 12,
        paddingVertical: 8,
    },
    forgotText: {
        color:    'rgba(255,255,255,0.35)',
        fontSize: 13,
        textDecorationLine: 'underline',
    },
    cancelButton: {
        paddingVertical:   12,
        paddingHorizontal: 32,
        borderRadius:      12,
        backgroundColor:   '#1e1e1e',
        borderWidth:       1,
        borderColor:       '#333',
    },
    cancelText: {
        color:      '#aaa',
        fontSize:   15,
        fontWeight: '500',
    },
});

export default PINEntryModal;