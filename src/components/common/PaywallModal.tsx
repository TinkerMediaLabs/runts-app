/**
 * PaywallModal.tsx
 * Bottom sheet shown when a free user taps a locked story.
 * Presents the premium offering and lets the user subscribe or dismiss.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    PurchasesService,
    type PurchasesOffering,
    type PurchasesPackage,
} from '@/lib/purchases';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
    visible:    boolean;
    onClose:    () => void;
    storyTitle?: string;
}

// ---------------------------------------------------------------------------
// Feature bullets
// ---------------------------------------------------------------------------

const FEATURES = [
    { icon: 'infinity',    text: 'Unlimited access to all stories' },
    { icon: 'fire',        text: 'Exclusive and premium genres' },
    { icon: 'moon',        text: 'Offline listening for pinned stories' },
    { icon: 'ban',         text: 'No ads' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaywallModal({ visible, onClose, storyTitle }: Props) {
    const insets = useSafeAreaInsets();

    const [offering,         setOffering]         = useState<PurchasesOffering | null>(null);
    const [offeringsLoading, setOfferingsLoading] = useState(true);
    const [purchasing,       setPurchasing]        = useState(false);

    useEffect(() => {
        if (!visible) return;
        PurchasesService.getOfferings().then(o => {
            setOffering(o);
            setOfferingsLoading(false);
        });
    }, [visible]);

    const annualPkg  = offering?.availablePackages.find(p => p.packageType === 'ANNUAL')  ?? null;
    const monthlyPkg = offering?.availablePackages.find(p => p.packageType === 'MONTHLY') ?? null;

    const handleSubscribe = async (pkg: PurchasesPackage) => {
        setPurchasing(true);
        try {
            const success = await PurchasesService.purchase(pkg);
            if (success) {
                onClose();
                Alert.alert('Welcome to Premium!', 'You now have unlimited access.');
            }
        } catch (err: any) {
            Alert.alert('Purchase failed', err?.message ?? 'Something went wrong.');
        } finally {
            setPurchasing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
                {/* Handle */}
                <View style={styles.handle} />

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.lockBadge}>
                        <FontAwesome5 name="lock" size={14} color="cyan" iconStyle="solid" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Premium Story</Text>
                        {storyTitle && (
                            <Text style={styles.subtitle} numberOfLines={1}>
                                "{storyTitle}" requires a premium subscription
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <FontAwesome5 name="times" size={16} color="#ffffff50" iconStyle="solid" />
                    </TouchableOpacity>
                </View>

                {/* Features */}
                <View style={styles.features}>
                    {FEATURES.map(f => (
                        <View key={f.icon} style={styles.featureRow}>
                            <View style={styles.featureIcon}>
                                <FontAwesome5 name={f.icon as any} size={11} color="cyan" iconStyle="solid" />
                            </View>
                            <Text style={styles.featureText}>{f.text}</Text>
                        </View>
                    ))}
                </View>

                {/* Offerings */}
                {offeringsLoading ? (
                    <ActivityIndicator color="cyan" style={{ marginVertical: 20 }} />
                ) : (
                    <View style={styles.packages}>
                        {annualPkg && (
                            <TouchableOpacity
                                style={styles.packagePrimary}
                                activeOpacity={0.85}
                                onPress={() => handleSubscribe(annualPkg)}
                                disabled={purchasing}
                            >
                                {purchasing ? (
                                    <ActivityIndicator color="#000" />
                                ) : (
                                    <>
                                        <View>
                                            <Text style={styles.packagePrimaryLabel}>Annual</Text>
                                            <Text style={styles.packagePrimaryNote}>Best value · save ~17%</Text>
                                        </View>
                                        <Text style={styles.packagePrimaryPrice}>
                                            {annualPkg.product.priceString} / yr
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        {monthlyPkg && (
                            <TouchableOpacity
                                style={styles.packageSecondary}
                                activeOpacity={0.85}
                                onPress={() => handleSubscribe(monthlyPkg)}
                                disabled={purchasing}
                            >
                                <Text style={styles.packageSecondaryText}>
                                    Monthly · {monthlyPkg.product.priceString} / mo
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <Text style={styles.legalNote}>
                    Subscriptions renew automatically. Cancel anytime in your app store settings.
                </Text>
            </View>
        </Modal>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        position:        'absolute',
        bottom:          0,
        left:            0,
        right:           0,
        backgroundColor: '#111',
        borderTopLeftRadius:  24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop:       12,
        borderWidth:      1,
        borderBottomWidth: 0,
        borderColor:      '#2a2a2a',
    },
    handle: {
        width:           36,
        height:          4,
        borderRadius:    2,
        backgroundColor: '#ffffff30',
        alignSelf:       'center',
        marginBottom:    20,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           12,
        marginBottom:  20,
    },
    lockBadge: {
        width:           36,
        height:          36,
        borderRadius:    10,
        backgroundColor: 'rgba(0,255,255,0.1)',
        borderWidth:     1,
        borderColor:     'rgba(0,255,255,0.2)',
        justifyContent:  'center',
        alignItems:      'center',
    },
    title: {
        fontSize:   16,
        fontWeight: '700',
        color:      '#fff',
    },
    subtitle: {
        fontSize: 12,
        color:    'rgba(255,255,255,0.5)',
        marginTop: 2,
    },

    // ── Features ──────────────────────────────────────────────────────────────
    features: {
        gap:          8,
        marginBottom: 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           10,
    },
    featureIcon: {
        width:           24,
        height:          24,
        borderRadius:    6,
        backgroundColor: 'rgba(0,255,255,0.07)',
        justifyContent:  'center',
        alignItems:      'center',
    },
    featureText: {
        fontSize: 13,
        color:    'rgba(255,255,255,0.7)',
    },

    // ── Packages ──────────────────────────────────────────────────────────────
    packages: {
        gap:          10,
        marginBottom: 12,
    },
    packagePrimary: {
        backgroundColor: 'cyan',
        borderRadius:    14,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection:   'row',
        justifyContent:  'space-between',
        alignItems:      'center',
        minHeight:       52,
    },
    packagePrimaryLabel: {
        fontSize:   15,
        fontWeight: '700',
        color:      '#000',
    },
    packagePrimaryNote: {
        fontSize: 11,
        color:    'rgba(0,0,0,0.6)',
        marginTop: 2,
    },
    packagePrimaryPrice: {
        fontSize:   15,
        fontWeight: '700',
        color:      '#000',
    },
    packageSecondary: {
        borderWidth:  1,
        borderColor:  '#2a2a2a',
        borderRadius: 14,
        paddingVertical: 12,
        alignItems:   'center',
    },
    packageSecondaryText: {
        fontSize:   14,
        color:      'rgba(255,255,255,0.6)',
        fontWeight: '500',
    },

    // ── Legal ─────────────────────────────────────────────────────────────────
    legalNote: {
        fontSize:   11,
        color:      'rgba(255,255,255,0.25)',
        textAlign:  'center',
        lineHeight: 16,
    },
});