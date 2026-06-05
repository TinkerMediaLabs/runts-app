// Premium tab — shown to non-subscribed users.
// Shows plan options and calls to action to subscribe.

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
    Linking,
    Image
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { spacing } from '../../theme/spacing';
import { useApp } from '@/context/AppContext';

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlanId = 'annual' | 'monthly';

type Plan = {
    id: PlanId;
    period: string;
    periodShort: string;
    price: string;
    perMonth: string;
    badge?: string;
};

type Feature = {
    icon: any;
    title: string;
    description: string;
};

// ---------------------------------------------------------------------------
// Constants — swap prices with live RevenueCat/Purchases values
// ---------------------------------------------------------------------------

const PLANS: Plan[] = [
    {
        id: 'annual',
        period: 'Annually',
        periodShort: '1 YEAR',
        price: '$50',
        perMonth: '$4.16 / mo',
        badge: 'SAVE 17%',
    },
    {
        id: 'monthly',
        period: 'Monthly',
        periodShort: '1 MONTH',
        price: '$5',
        perMonth: 'monthly',
    },
];

const FEATURES: Feature[] = [
    {
        icon: 'headphones',
        title: 'Unlimited Listening',
        description: 'Access every story in the full catalogue, anytime.',
    },
    {
        icon: 'star',
        title: 'Curated Content',
        description: 'Exclusive picks from editors and top authors.',
    },
    {
        icon: 'moon',
        title: 'Sleep Timer',
        description: 'Fall asleep to stories without burning through the night.',
    },
    {
        icon: 'tachometer-alt',
        title: 'Variable Playback Speed',
        description: 'Listen at your own pace from 0.75× to 2×.',
    },
    {
        icon: 'fire',
        title: 'Mature Content',
        description: 'Opt in to after-dark stories when you are ready.',
    },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const PlanCard = ({
    plan,
    selected,
    onPress,
}: {
    plan: Plan;
    selected: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.planCard, selected && styles.planCardSelected]}
    >
        {plan.badge && (
            <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{plan.badge}</Text>
            </View>
        )}

        <Text style={[styles.planPeriodShort, selected && styles.planTextSelected]}>
            {plan.periodShort}
        </Text>

        <Text style={[styles.planPrice, selected && styles.planTextSelected]}>
            {plan.price}
        </Text>

        <Text style={[styles.planPerMonth, selected && styles.planPerMonthSelected]}>
            {plan.perMonth}
        </Text>

        {selected && (
            <View style={styles.planCheck}>
                <FontAwesome5 name="check" size={10} color="#000" iconStyle="solid" />
            </View>
        )}
    </TouchableOpacity>
);

const FeatureRow = ({ icon, title, description }: Feature) => (
    <View style={styles.featureRow}>
        <View style={styles.featureIcon}>
            <FontAwesome5 name={icon} size={15} color="cyan" iconStyle="solid" />
        </View>
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
        </View>
    </View>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const PremiumScreen = () => {

    const { userId } = useApp();
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();

    const [selectedPlan, setSelectedPlan] = useState<PlanId>('annual');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubscribe = async () => {
        if (!selectedPlan) return;
        setIsLoading(true);
        // TODO: const offering = await Purchases.getOfferings();
        // TODO: await Purchases.purchasePackage(selectedPackage);
        setIsLoading(false);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <LinearGradient
                colors={['#0a0a14', '#12121a', '#000']}
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
        
                            <Image style={{height: 60, width: 60, margin: 20}} source={require('../../../assets/images/icon72w.png')}/>

                        <Text style={styles.heroTitle}>Go Premium</Text>
                        <Text style={styles.heroSubtitle}>
                            Unlock the full experience — more stories, exclusive content, and more.
                        </Text>
                    </View>

                    {/* ── Plan picker ── */}
                    <View style={styles.planRow}>
                        {PLANS.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                selected={selectedPlan === plan.id}
                                onPress={() => setSelectedPlan(plan.id)}
                            />
                        ))}
                    </View>

                    {/* ── CTA ── */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleSubscribe}
                        disabled={isLoading}
                        style={[styles.ctaButton, isLoading && { opacity: 0.6 }]}
                    >
                        <Text style={styles.ctaText}>
                            {isLoading ? 'Processing…' : 'Start Premium'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.renewalNote}>
                        Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period.
                    </Text>

                    {/* ── Features ── */}
                    <View style={styles.featuresSection}>
                        <Text style={styles.sectionTitle}>What's included</Text>
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
                        <TouchableOpacity onPress={() => Linking.openURL('https://www.tinkermedia.net/terms')}>
                            <Text style={styles.legalLink}>Terms</Text>
                        </TouchableOpacity>
                        <Text style={styles.legalDot}>·</Text>
                        <TouchableOpacity onPress={() => Linking.openURL('https://www.tinkermedia.net/privacy-policy')}>
                            <Text style={styles.legalLink}>Privacy Policy</Text>
                        </TouchableOpacity>
                        <Text style={styles.legalDot}>·</Text>
                        <TouchableOpacity onPress={() => {/* TODO: restore purchases */}}>
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

    scrollContent: {
        paddingHorizontal: spacing.margin * 2,
    },

    // ── Hero ──────────────────────────────────────────────────────────────────
    hero: {
        alignItems: 'center',
        marginBottom: 32,
    },
    heroIcon: {
        width: 68,
        height: 68,
        borderRadius: 20,
        backgroundColor: 'rgba(0,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(0,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.3,
        marginBottom: 10,
    },
    heroSubtitle: {
        fontSize: 15,
        color: '#ffffff70',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },

    // ── Plans ─────────────────────────────────────────────────────────────────
    planRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    planCard: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        padding: 16,
        alignItems: 'center',
        position: 'relative',
    },
    planCardSelected: {
        backgroundColor: 'rgba(0,255,255,0.08)',
        borderColor: 'cyan',
    },
    planBadge: {
        position: 'absolute',
        top: -10,
        backgroundColor: '#8F7900',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    planBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
    },
    planPeriodShort: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff50',
        letterSpacing: 1,
        marginTop: 8,
        marginBottom: 8,
    },
    planPrice: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    planPerMonth: {
        fontSize: 12,
        color: '#ffffff50',
    },
    planPerMonthSelected: {
        color: 'rgba(0,255,255,0.6)',
    },
    planTextSelected: {
        color: 'cyan',
    },
    planCheck: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'cyan',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── CTA ───────────────────────────────────────────────────────────────────
    ctaButton: {
        backgroundColor: 'cyan',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 14,
    },
    ctaText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 0.3,
    },
    renewalNote: {
        fontSize: 11,
        color: '#ffffff40',
        textAlign: 'center',
        lineHeight: 17,
        marginBottom: 36,
        paddingHorizontal: 10,
    },

    // ── Features ──────────────────────────────────────────────────────────────
    featuresSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: '#ffffff50',
        marginBottom: 10,
        marginLeft: 4,
    },
    featuresCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2a2a2a',
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
        borderRadius: 9,
        backgroundColor: 'rgba(0,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(0,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 1,
    },
    featureTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 3,
    },
    featureDescription: {
        fontSize: 13,
        color: '#ffffff60',
        lineHeight: 19,
    },
    featureDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#2a2a2a',
        marginLeft: 62,
    },

    // ── Legal ─────────────────────────────────────────────────────────────────
    legalRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    legalLink: {
        fontSize: 12,
        color: '#ffffff40',
        textDecorationLine: 'underline',
    },
    legalDot: {
        fontSize: 12,
        color: '#ffffff25',
    },
});

export default PremiumScreen;