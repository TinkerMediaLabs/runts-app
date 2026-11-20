// Premium tab — shown to non-subscribed users.
// Shows plan options and calls to action to subscribe.

import { TERMS_URL, PRIVACY_URL } from '../../constants/legal';
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet, Linking, Image, Alert, ActivityIndicator } from 'react-native';
import { Text } from '@/components/common/AppText';
import Button from '@/components/common/Button';

import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { spacing } from '../../theme/spacing';
import { useApp } from '@/context/AppContext';
import {
    PurchasesService,
    type PurchasesOffering,
    type PurchasesPackage,
} from '@/lib/purchases';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';
import SectionLabel from '@/components/common/SectionLabel';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { unwrap } from '@/lib/amplifyResult';
import { savingsPercent } from '@/lib/savings';
import { useFreePremiumOffer } from '@/hooks/queries/useFreePremiumOffer';
import { askForAccount } from '@/lib/requireAccount';
import Icon from '@/components/common/Icon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlanId = 'annual' | 'monthly';

type Feature = {
    icon: any;
    title: string;
    description: string;
};

// ---------------------------------------------------------------------------
// Feature list
// ---------------------------------------------------------------------------

const FEATURES: Feature[] = [
    {
        icon: 'infinity',
        title: 'Unlimited Story Access',
        description: 'Access the entire Runts story catalog. Discover new stories, explore different genres, and immerse yourself in worlds of storytelling.',
    },
    {
        icon: 'fire',
        title: 'Mature & Erotica Content',
        description: 'Unlock our collection of after-dark stories, including adult themes, romance, and erotica.',
    },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const PlanCard = ({
    pkg,
    selected,
    onPress,
    isAnnual,
    savings = 0,
}: {
    pkg:      PurchasesPackage;
    selected: boolean;
    onPress:  () => void;
    isAnnual: boolean;
    savings?: number;
}) => {
    const product    = pkg.product;
    const price      = product.priceString;
    const perMonth   = isAnnual
        ? `${(product.price / 12).toLocaleString('en-US', { style: 'currency', currency: product.currencyCode })} / mo`
        : 'billed monthly';
    const periodShort = isAnnual ? '1 YEAR' : '1 MONTH';

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            style={[styles.planCard, selected && styles.planCardSelected]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${isAnnual ? (savings > 0 ? `Annual plan, save ${savings} percent` : 'Annual plan') : 'Monthly plan'}, ${price}, ${perMonth}`}
        >
            {isAnnual && savings > 0 && (
                <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>SAVE {savings}%</Text>
                </View>
            )}

            <Text style={[styles.planPeriodShort, selected && styles.planTextSelected]}>
                {periodShort}
            </Text>

            <Text style={[styles.planPrice, selected && styles.planTextSelected]}>
                {price}
            </Text>

            <Text style={[styles.planPerMonth, selected && styles.planPerMonthSelected]}>
                {perMonth}
            </Text>

            {selected && (
                <View style={styles.planCheck}>
                    <Icon name="check" size={10} color={colors.textOnAccent} />
                </View>
            )}
        </TouchableOpacity>
    );
};

const FeatureRow = ({ icon, title, description }: Feature) => (
    <View style={styles.featureRow}>
        <View style={styles.featureIcon}>
            <Icon name={icon} size={iconSize.lg} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
        </View>
    </View>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const PremiumScreen = () => {

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const { userId, refreshAuth, isGuest } = useApp();
    const { open: offerOpen } = useFreePremiumOffer();
    const [claimed,   setClaimed]   = useState(false);   // this person already used the offer
    const [claiming,  setClaiming]  = useState(false);
    const insets       = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();

    const [offering,      setOffering]      = useState<PurchasesOffering | null>(null);
    const [selectedPlan,  setSelectedPlan]  = useState<PlanId>('annual');
    const [isLoading,     setIsLoading]     = useState(false);
    const [offeringsLoading, setOfferingsLoading] = useState(true);

    // Load offerings from RevenueCat
    useEffect(() => {
        PurchasesService.getOfferings().then(o => {
            setOffering(o);
            setOfferingsLoading(false);
        });
    }, []);

    // Find the selected package from the offering
    const annualPkg  = offering?.availablePackages.find(p => p.packageType === 'ANNUAL')  ?? null;
    const monthlyPkg = offering?.availablePackages.find(p => p.packageType === 'MONTHLY') ?? null;
    const savings = savingsPercent(annualPkg?.product.price, monthlyPkg?.product.price);
    const selectedPkg: PurchasesPackage | null =
        selectedPlan === 'annual' ? annualPkg : monthlyPkg;

    const handleSubscribe = async () => {
        if (!selectedPkg) return;
        setIsLoading(true);
        try {
            const success = await PurchasesService.purchase(selectedPkg);
            if (success) {
                Alert.alert('Welcome to Premium!', 'Your subscription is now active.', [
                    { text: 'OK', onPress: () => navigation.reset({
                        index: 0,
                        routes: [{ name: 'Root' }],
                    })}
                ]);
                
            }
        } catch (err: any) {
            Alert.alert('Purchase failed', err?.message ?? 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // The free offer: the server records the claim once and grants 3 months of Premium (no payment method).
    const handleClaimFree = async () => {
        if (isGuest) { askForAccount('claim your 3 free months of Premium'); return; }
        setClaiming(true);
        try {
            const client = generateClient<Schema>();
            const result = unwrap(await client.mutations.claimFreePremium(), 'Claim free Premium');
            if (result === 'granted') {
                await PurchasesService.refreshPremium();
                await refreshAuth();
                Alert.alert('Enjoy Premium!', 'You have 3 months of Premium, free. It ends on its own and never charges you.', [
                    { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Root' }] }) },
                ]);
            } else if (result === 'already_claimed') {
                setClaimed(true);
                Alert.alert('Already used', 'You have already used your free 3 months. You can subscribe below to keep Premium.');
            } else {
                setClaimed(true);
                Alert.alert('Offer ended', 'The free Premium offer is no longer available.');
            }
        } catch (err: any) {
            console.warn('Claim free Premium failed:', err);
            Alert.alert('Something went wrong', 'We could not start your free months. Please check your connection and try again.');
        } finally {
            setClaiming(false);
        }
    };

    const handleRestore = async () => {
        setIsLoading(true);
        try {
            const success = await PurchasesService.restorePurchases();
            if (success) {
                Alert.alert('Restored!', 'Your premium subscription has been restored.', [
                    { text: 'OK', onPress: () => navigation.reset({
                        index: 0,
                        routes: [{ name: 'Root' }],
                    }) }
                ]);
            } else {
                Alert.alert('No purchases found', 'We could not find an active subscription to restore.');
            }
        } catch {
            Alert.alert('Restore failed', 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.surface0 }}>
            <LinearGradient
                colors={['#0a0a14', '#0f1112', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top + 20, paddingBottom: tabBarHeight + 20 },
                    ]}
                >
                    {/* ── Hero ── */}
                    <View style={styles.hero}>
                        <Image
                            style={{ height: 60, width: 60, margin: 20 }}
                            source={require('../../../assets/images/icon72w.png')}
                        />
                        <Text style={styles.heroTitle}>Go Premium</Text>
                        <Text style={styles.heroSubtitle}>
                            Unlock the full experience — more stories, exclusive content, and more.
                        </Text>
                    </View>

                    {/* ── Plan picker ── */}
                    {offeringsLoading ? (
                        <View style={styles.offeringsLoader}>
                            <ActivityIndicator color={colors.accent} />
                        </View>
                    ) : !annualPkg && !monthlyPkg ? (
                        <Text style={styles.noPlans}>
                            Plans aren't available right now. Please try again later.
                        </Text>
                    ) : (
                        <View style={styles.planRow}>
                            {annualPkg && (
                                <PlanCard
                                    pkg={annualPkg}
                                    selected={selectedPlan === 'annual'}
                                    onPress={() => setSelectedPlan('annual')}
                                    isAnnual
                                    savings={savings}
                                />
                            )}
                            {monthlyPkg && (
                                <PlanCard
                                    pkg={monthlyPkg}
                                    selected={selectedPlan === 'monthly'}
                                    onPress={() => setSelectedPlan('monthly')}
                                    isAnnual={false}
                                />
                            )}
                        </View>
                    )}

                    {/* ── CTA ── */}
                    <Button
                        label="Start Premium"
                        loading={isLoading}
                        disabled={offeringsLoading || !selectedPkg}
                        onPress={handleSubscribe}
                        style={{ marginBottom: 14 }}
                    />

                    <Text style={styles.renewalNote}>
                        Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period.
                    </Text>

                    {/* ── Free offer: below the paid plans (open while the CMS end date has not passed) ── */}
                    {offerOpen && !claimed && (
                        <View style={styles.freeOffer}>
                            <View style={styles.freeOfferBadge}>
                                <Text style={styles.freeOfferBadgeText}>BETA EXCLUSIVE</Text>
                            </View>
                            <Text style={styles.freeOfferTitle}>Your first 3 months are on us.</Text>
                            <Text style={styles.freeOfferText}>
                                Enjoy the complete Runts Premium experience while we're building something special.
                            </Text>
                            <Button
                                label="Activate Free Beta Access"
                                loading={claiming}
                                disabled={claiming || isLoading}
                                onPress={handleClaimFree}
                                glow
                                style={{ marginTop: 16, alignSelf: 'stretch' }}
                            />
                            <Text style={styles.freeOfferNote}>
                                No payment information required. Access ends automatically after 3 months.
                            </Text>
                        </View>
                    )}

                    {/* ── Features ── */}
                    <View style={styles.featuresSection}>
                        <SectionLabel text="What's included" />
                        <View style={styles.featuresCard}>
                            {FEATURES.map((f, i) => (
                                <React.Fragment key={f.title}>
                                    <FeatureRow {...f} />
                                    {i < FEATURES.length - 1 && <View style={styles.featureDivider} />}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>

                    {/* ── Legal ── */}
                    <View style={styles.legalRow}>
                        <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)}>
                            <Text style={styles.legalLink}>Terms</Text>
                        </TouchableOpacity>
                        <Text style={styles.legalDot}>·</Text>
                        <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)}>
                            <Text style={styles.legalLink}>Privacy Policy</Text>
                        </TouchableOpacity>
                        <Text style={styles.legalDot}>·</Text>
                        <TouchableOpacity accessibilityRole="button" onPress={handleRestore} disabled={isLoading}>
                            <Text style={styles.legalLink}>Restore Purchase</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </LinearGradient>
        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    noPlans: {
        color: colors.textSecondary,
        fontSize: fontSizes.small,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 18,
    },

    freeOffer: {
        backgroundColor: colors.surface0,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.accent,
        paddingVertical: 20,
        paddingHorizontal: 16,
        marginBottom: 20,
        alignItems: 'center',
    },
    freeOfferBadge: {
        backgroundColor: colors.accentWash,
        borderRadius: radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginBottom: 12,
    },
    freeOfferBadgeText: {
        color: colors.accent,
        fontSize: fontSizes.caption,
        fontWeight: '700',
        letterSpacing: 1,
    },
    freeOfferTitle: {
        color: colors.textPrimary,
        fontSize: fontSizes.title,
        fontWeight: '800',
        textAlign: 'center',
    },
    freeOfferText: {
        color: colors.textSecondary,
        fontSize: fontSizes.small,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    freeOfferNote: {
        color: colors.textTertiary,
        fontSize: fontSizes.caption,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 17,
    },

    scrollContent: {
        paddingHorizontal: spacing.margin,
    },

    hero: {
        alignItems: 'center',
        marginBottom: 32,
    },
    heroTitle: {
        fontSize: fontSizes.display,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.3,
        marginBottom: 10,
    },
    heroSubtitle: {
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },

    offeringsLoader: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },

    planRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    planCard: {
        flex: 1,
        backgroundColor: colors.surface2,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        alignItems: 'center',
        position: 'relative',
    },
    planCardSelected: {
        backgroundColor: colors.accentTint,
        borderColor: colors.accent,
        borderWidth: 2,
        padding: 15,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 6,
    },
    planBadge: {
        position: 'absolute',
        top: -10,
        backgroundColor: colors.goldDeep,
        borderRadius: radius.xl,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    planBadgeText: {
        fontSize: fontSizes.caption,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    planPeriodShort: {
        fontSize: fontSizes.caption,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 1,
        marginTop: 8,
        marginBottom: 8,
    },
    planPrice: {
        fontSize: fontSizes.headline,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    planPerMonth: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
    },
    planPerMonthSelected: {
        color: colors.accent,
    },
    planTextSelected: {
        color: colors.accent,
    },
    planCheck: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 18,
        height: 18,
        borderRadius: radius.pill,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },

    renewalNote: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 17,
        marginBottom: 36,
        paddingHorizontal: 10,
    },

    featuresSection: {
        marginBottom: 32,
    },
    featuresCard: {
        backgroundColor: colors.surface2,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        gap: 14,
    },
    featureIcon: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureTitle: {
        fontSize: fontSizes.body,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 3,
    },
    featureDescription: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
        lineHeight: 19,
    },
    featureDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.surface3,
        marginLeft: 62,
    },

    legalRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    legalLink: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
        textDecorationLine: 'underline',
    },
    legalDot: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
    },
});

export default PremiumScreen;