import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { useApp } from '@/context/AppContext';

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
    visible:   boolean;
    onSuccess: () => void;   // called after PIN confirmed and saved
    onCancel:  () => void;
};

type Step = 'enter' | 'confirm';

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

const PINSetupModal = ({ visible, onSuccess, onCancel }: Props) => {
    const { setEroticPin } = useApp();

    const [step,       setStep]       = useState<Step>('enter');
    const [firstPin,   setFirstPin]   = useState('');
    const [pin,        setPin]        = useState('');
    const [error,      setError]      = useState('');

    const inputRef  = useRef<TextInput>(null);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Reset and focus when modal opens
    useEffect(() => {
        if (visible) {
            setStep('enter');
            setFirstPin('');
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
        const digits = value.replace(/\D/g, '').slice(0, 4);
        setPin(digits);
        setError('');

        if (digits.length < 4) return;

        if (step === 'enter') {
            // First entry complete — move to confirm step
            setFirstPin(digits);
            setPin('');
            setStep('confirm');
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            // Confirm step — check match
            if (digits === firstPin) {
                await setEroticPin(digits);
                setPin('');
                onSuccess();
            } else {
                shake();
                setError("PINs don't match. Start over.");
                setPin('');
                setFirstPin('');
                setStep('enter');
                setTimeout(() => inputRef.current?.focus(), 50);
            }
        }
    };

    const stepTitle    = step === 'enter' ? 'Create PIN'  : 'Confirm PIN';
    const stepSubtitle = step === 'enter'
        ? 'Choose a 4-digit PIN to lock erotic content settings.'
        : 'Enter your PIN again to confirm.';

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
                    {/* Step indicator */}
                    <View style={styles.stepRow}>
                        <View style={[styles.stepDot, step === 'enter'   && styles.stepDotActive]} />
                        <View style={[styles.stepDot, step === 'confirm' && styles.stepDotActive]} />
                    </View>

                    <Text style={styles.title}>{stepTitle}</Text>
                    <Text style={styles.subtitle}>{stepSubtitle}</Text>

                    {/* Warning — shown only on first step */}
                    {step === 'enter' && (
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>
                                ⚠️  If you forget your PIN, contact{' '}
                                <Text style={styles.warningEmail}>admin@tinkermedia.net</Text>
                                {' '}for support. There is no automatic recovery.
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => inputRef.current?.focus()}
                    >
                        <PINDots length={pin.length} />
                    </TouchableOpacity>

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
    stepRow: {
        flexDirection: 'row',
        gap:           8,
        marginBottom:  20,
    },
    stepDot: {
        width:           8,
        height:          8,
        borderRadius:    4,
        backgroundColor: '#333',
    },
    stepDotActive: {
        backgroundColor: 'cyan',
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
        marginBottom: 20,
        lineHeight:   20,
    },
    warningBox: {
        backgroundColor: 'rgba(255,200,0,0.08)',
        borderWidth:     1,
        borderColor:     'rgba(255,200,0,0.2)',
        borderRadius:    12,
        padding:         12,
        marginBottom:    24,
        width:           '100%',
    },
    warningText: {
        color:      'rgba(255,200,0,0.8)',
        fontSize:   12,
        lineHeight: 18,
        textAlign:  'center',
    },
    warningEmail: {
        fontWeight:         '600',
        textDecorationLine: 'underline',
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
    cancelButton: {
        paddingVertical:   12,
        paddingHorizontal: 32,
        borderRadius:      12,
        backgroundColor:   '#1e1e1e',
        borderWidth:       1,
        borderColor:       '#333',
        marginTop:         8,
    },
    cancelText: {
        color:      '#aaa',
        fontSize:   15,
        fontWeight: '500',
    },
});

export default PINSetupModal;