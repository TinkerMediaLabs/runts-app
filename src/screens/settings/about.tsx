import React from 'react';
import { TERMS_URL, PRIVACY_URL } from '../../constants/legal';
import { View, ScrollView, TouchableOpacity, Linking, StyleSheet, Image } from 'react-native';
import { Text } from '@/components/common/AppText';

import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Screen from '@/components/common/Screen';
import MenuHeader from '../../components/common/MenuHeader';
import { spacing } from '../../theme/spacing';

import Constants from 'expo-constants';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionCard}>{children}</View>
    </View>
);

const RowDivider = () => <View style={styles.divider} />;

const LinkRow = ({
    icon,
    label,
    onPress,
}: {
    icon: any;
    label: string;
    onPress: () => void;
}) => (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.row} accessibilityRole="link" accessibilityLabel={label}>
        <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
                <FontAwesome5 name={icon} size={iconSize.xs} color={colors.textSecondary} iconStyle="solid" />
            </View>
            <Text style={styles.rowLabel}>{label}</Text>
        </View>
        <FontAwesome5 name="chevron-right" size={iconSize.xs} color={colors.textSecondary} iconStyle="solid" />
    </TouchableOpacity>
);

const InfoRow = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
    <View style={styles.row}>
        <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
                <FontAwesome5 name={icon} size={iconSize.xs} color={colors.textSecondary} iconStyle="solid" />
            </View>
            <Text style={styles.rowLabel}>{label}</Text>
        </View>
        <Text style={styles.rowValue}>{value}</Text>
    </View>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0'

const AboutScreen = ({ navigation }: any) => {

    const insets = useSafeAreaInsets();

    return (
        <Screen>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#000', '#12121a', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >
                <MenuHeader title="About" navigation={navigation} />

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                >

                    {/* ── App identity ── */}
                    <View style={styles.hero}>
                        <View style={styles.heroIcon}>
                            <Image
                                source={require('../../../assets/images/icon72w.png')}
                                style={{
                                    width: 100,
                                    height: 100,
                                    resizeMode: 'contain',
                                }}
                            />
                        </View>
                        <Text style={styles.heroTitle}>Runts</Text>
                        <Text style={styles.heroSubtitle}>Stories for everyone</Text>
                        {/* <View style={styles.versionBadge}>
                            <Text style={styles.versionBadgeText}>v{APP_VERSION}</Text>
                        </View> */}
                    </View>

                    {/* ── App info ── */}
                    <Section title="App Info">
                        <InfoRow icon="code-branch" label="Version"     value={APP_VERSION} />
                        <RowDivider />
                        {/* <InfoRow icon="mobile-alt"  label="Platform"    value="iOS & Android" />
                        <RowDivider /> */}
                        {/* <InfoRow icon="building"    label="Developer"   value="Martian Spider Media" /> */}
                    </Section>

                    {/* ── Legal ── */}
                    <Section title="Legal">
                        <LinkRow
                            icon="file-contract"
                            label="Terms and Conditions"
                            onPress={() => Linking.openURL(TERMS_URL)}
                        />
                        <RowDivider />
                        <LinkRow
                            icon="shield-alt"
                            label="Privacy Policy"
                            onPress={() => Linking.openURL(PRIVACY_URL)}
                        />
                    </Section>

                    {/* ── Support ── */}
                    <Section title="Support">
                        {/* <LinkRow
                            icon="question-circle"
                            label="FAQ"
                            onPress={() => Linking.openURL('http://www.tinkermedia.net/runts/faq')}
                        />
                        <RowDivider /> */}
                        <LinkRow
                            icon="envelope"
                            label="Contact Us"
                            onPress={() => Linking.openURL('mailto:admin@tinkermedia.net')}
                        />
                        <RowDivider />
                        <LinkRow
                            icon="bug"
                            label="Report a Bug"
                            onPress={() => Linking.openURL('mailto:admin@tinkermedia.net?subject=Bug%20Report')}
                        />
                    </Section>

                    {/* ── Social ── */}
                    <Section title="Follow Us">
                        <LinkRow
                            icon="globe"
                            label="Website"
                            onPress={() => Linking.openURL('http://www.tinkermedia.net/runts')}
                        />
                        <RowDivider />
                        {/* <LinkRow
                            icon="instagram"
                            label="Instagram"
                            onPress={() => Linking.openURL('https://instagram.com/twispapp')}
                        /> */}
                    </Section>

                    <Text style={styles.footer}>
                        © {new Date().getFullYear()} Tinker Media LLC{'\n'}All rights reserved.
                    </Text>

                </ScrollView>
            </LinearGradient>
        </Screen>
    );
};

// ---------------------------------------------------------------------------
// Styles — matches account.tsx and appSettings.tsx
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    scrollContent: {
        paddingBottom: 60,
    },

    // ── Hero ──────────────────────────────────────────────────────────────────
    hero: {
        alignItems: 'center',
        paddingVertical: 36,
        paddingHorizontal: spacing.margin,
    },
    heroIcon: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: fontSizes.headline,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    heroSubtitle: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
        marginTop: 4,
        marginBottom: 16,
    },
    versionBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: radius.xl,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    versionBadgeText: {
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },

    // ── Sections ──────────────────────────────────────────────────────────────
    section: {
        marginTop: 24,
        paddingHorizontal: spacing.margin,
    },
    sectionTitle: {
        fontSize: fontSizes.caption,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textSecondary,
        marginBottom: 10,
        marginLeft: 4,
    },
    sectionCard: {
        backgroundColor: colors.surface2,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },

    // ── Rows ─────────────────────────────────────────────────────────────────
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 52,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rowIcon: {
        width: 30,
        height: 30,
        borderRadius: radius.sm,
        backgroundColor: colors.surface3,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowLabel: {
        fontSize: fontSizes.body,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    rowValue: {
        fontSize: fontSizes.small,
        color: colors.textSecondary,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.surface3,
        marginLeft: 58,
    },

    // ── Footer ────────────────────────────────────────────────────────────────
    footer: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: fontSizes.caption,
        lineHeight: 20,
        marginTop: 40,
        paddingHorizontal: spacing.margin * 2,
    },
});

export default AboutScreen;