/**
 * PaywallModal.tsx
 * Bottom sheet shown when a free user taps a locked story.
 * Presents the premium offering and lets the user subscribe or dismiss.
 */

import { TERMS_URL, PRIVACY_URL } from '../../constants/legal';
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { Text } from '@/components/common/AppText';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    PurchasesService,
    type PurchasesOffering,
    type PurchasesPackage,
} from '@/lib/purchases';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';
import Icon from '@/components/common/Icon';
import { savingsPercent } from '@/lib/savings';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSheetDrag } from '@/hooks/useSheetDrag';

// The sheet never gets shorter when it has less to show (no story title, one plan, plans still loading).
const SHEET_MIN_HEIGHT = 480;

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
    { icon: 'infinity', text: 'Unlimited access to all stories' },
    { icon: 'fire',     text: 'Mature & Erotica Content' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaywallModal({ visible, onClose, storyTitle }: Props) {
    const insets = useSafeAreaInsets();
    const { gesture, sheetStyle } = useSheetDrag(onClose, visible);

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
    // Worked out from the store prices (never typed in), so it follows any price change.
    const savings = savingsPercent(annualPkg?.product.price, monthlyPkg?.product.price);

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
          <GestureHandlerRootView style={styles.root}>
            <TouchableWithoutFeedback onPress={onClose} accessibilityRole="button" accessibilityLabel="Close premium offer">
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 24, minHeight: SHEET_MIN_HEIGHT + insets.bottom }, sheetStyle]} accessibilityViewIsModal>
              <GestureDetector gesture={gesture}>
                <View collapsable={false}>
                {/* Handle */}
                <View style={styles.handle} />

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.lockBadge}>
                        <Icon name="lock" size={iconSize.lg} color={colors.accent} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Premium Story</Text>
                        {storyTitle && (
                            <Text style={styles.subtitle}>
                                "{storyTitle}" requires a premium subscription
                            </Text>
                        )}
                    </View>
                </View>
                </View>
              </GestureDetector>

                {/* Features */}
                <View style={styles.features}>
                    {FEATURES.map(f => (
                        <View key={f.icon} style={styles.featureRow}>
                            <View style={styles.featureIcon}>
                                <Icon name={f.icon as any} size={iconSize.lg} color={colors.accent} />
                            </View>
                            <Text style={styles.featureText}>{f.text}</Text>
                        </View>
                    ))}
                </View>

                {/* Offerings */}
                {offeringsLoading ? (
                    <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} />
                ) : !annualPkg && !monthlyPkg ? (
                    <Text style={styles.noPlans}>Plans aren't available right now. Please try again later.</Text>
                ) : (
                    <View style={styles.packages}>
                        {annualPkg && (
                            <TouchableOpacity
                                style={styles.packagePrimary}
                                activeOpacity={0.85}
                                onPress={() => handleSubscribe(annualPkg)}
                                disabled={purchasing}
                                accessibilityRole="button"
                                accessibilityLabel={`Subscribe annually, ${annualPkg.product.priceString} per year${savings > 0 ? `, save ${savings} percent` : ''}`}
                            >
                                {purchasing ? (
                                    <ActivityIndicator color={colors.textOnAccent} />
                                ) : (
                                    <>
                                        <View>
                                            <Text style={styles.packagePrimaryLabel}>Annual</Text>
                                            {savings > 0 ? <Text style={styles.packagePrimaryNote}>Save {savings}% vs monthly</Text> : null}
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
                                accessibilityRole="button"
                                accessibilityLabel={`Subscribe monthly, ${monthlyPkg.product.priceString} per month`}
                            >
                                <Text style={styles.packageSecondaryText}>
                                    Monthly · {monthlyPkg.product.priceString} / mo
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={{ flex: 1 }} />
                <Text style={styles.legalNote}>
                    Subscriptions renew automatically. Cancel anytime in your app store settings.
                </Text>
                <View style={styles.legalLinks}>
                    <Text accessibilityRole="link" style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text>
                    <Text style={styles.legalNote}>  ·  </Text>
                    <Text accessibilityRole="link" style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
                </View>
            </Animated.View>
          </GestureHandlerRootView>
        </Modal>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    root: { flex: 1 },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        position:        'absolute',
        bottom:          0,
        left:            0,
        right:           0,
        backgroundColor: colors.surface1,
        borderTopLeftRadius:  24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop:       12,
        borderWidth:      1,
        borderBottomWidth: 0,
        borderColor:      colors.border,
    },
    handle: {
        width:           36,
        height:          4,
        borderRadius:    2,
        backgroundColor: colors.white30,
        alignSelf:       'center',
        marginBottom:    20,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        alignItems:   'center',
        gap:          8,
        marginBottom: 24,
    },
    headerText: {
        alignItems: 'center',
    },
    lockBadge: {
        width:          32,
        height:         32,
        justifyContent: 'center',
        alignItems:     'center',
    },
    title: {
        fontSize:   fontSizes.subtitle,
        fontWeight: '700',
        color:      colors.textPrimary,
    },
    subtitle: {
        textAlign: 'center',
        fontSize: fontSizes.body,
        color:    colors.textSecondary,
        marginTop: 2,
    },

    // ── Features ──────────────────────────────────────────────────────────────
    features: {
        flexDirection: 'row',
        gap:           16,
        marginBottom:  24,
    },
    featureRow: {
        flex:       1,
        alignItems: 'center',
        gap:        8,
    },
    featureIcon: {
        width:          32,
        height:         32,
        justifyContent: 'center',
        alignItems:     'center',
    },
    featureText: {
        textAlign: 'center',
        fontSize: fontSizes.small,
        color:    colors.textStrong,
    },

    noPlans: {
        fontSize:     fontSizes.small,
        color:        colors.textSecondary,
        textAlign:    'center',
        marginVertical: 20,
    },

    // ── Packages ──────────────────────────────────────────────────────────────
    packages: {
        gap:          10,
        marginBottom: 12,
    },
    packagePrimary: {
        backgroundColor: colors.accent,
        borderRadius:    radius.lg,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection:   'row',
        justifyContent:  'space-between',
        alignItems:      'center',
        minHeight:       52,
    },
    packagePrimaryLabel: {
        fontSize:   fontSizes.body,
        fontWeight: '700',
        color:      colors.textOnAccent,
    },
    packagePrimaryNote: {
        fontSize: fontSizes.caption,
        color:    'rgba(0,0,0,0.6)',
        marginTop: 2,
    },
    packagePrimaryPrice: {
        fontSize:   fontSizes.body,
        fontWeight: '700',
        color:      colors.textOnAccent,
    },
    packageSecondary: {
        borderWidth:  1,
        borderColor:  colors.border,
        borderRadius: radius.lg,
        paddingVertical: 12,
        alignItems:   'center',
    },
    packageSecondaryText: {
        fontSize:   fontSizes.small,
        color:      colors.textSecondary,
        fontWeight: '500',
    },

    // ── Legal ─────────────────────────────────────────────────────────────────
    legalLinks: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
    legalLink: { fontSize: fontSizes.micro, color: colors.accent, textDecorationLine: 'underline', lineHeight: 16 },
    legalNote: {
        fontSize:   fontSizes.micro,
        color:      colors.textSecondary,
        textAlign:  'center',
        lineHeight: 16,
    },
});