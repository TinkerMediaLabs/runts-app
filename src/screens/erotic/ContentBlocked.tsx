import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Text } from '@/components/common/AppText';

import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const ContentBlocked = () => {
    const navigation = useNavigation<any>();
    const insets     = useSafeAreaInsets();

    // The tab bar is the "Root" screen and the settings screen is "AppSettingsScreen" (the old names, "Main" and
    // "AppSettings", do not exist and left this screen stuck).
    const handleGoToSettings = () => {
        navigation.reset({
            index: 1,
            routes: [{ name: 'Root' }, { name: 'AppSettingsScreen' }],
        });
    };

    const handleGoHome = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'Root' }],
        });
    };

    return (
        <View style={styles.root}>
            <LinearGradient
                colors={['#1a0800', '#0a0500', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <View style={[styles.content, {
                paddingTop:    insets.top    + 40,
                paddingBottom: insets.bottom + 40,
            }]}>

                {/* Icon */}
                <View style={styles.iconWrapper}>
                    <FontAwesome5
                        name={'lock' as any}
                        size={36}
                        color="#ff7c2a"
                        iconStyle="solid"
                    />
                </View>

                {/* Text */}
                <Text style={styles.title}>Content Blocked</Text>
                <Text style={styles.body}>
                    This story contains erotic content. You can enable erotic
                    stories in Settings to access this link.
                </Text>

                {/* Actions */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleGoToSettings}
                    accessibilityRole="button"
                    accessibilityLabel="Open Settings"
                    style={styles.primaryButton}
                >
                    <LinearGradient
                        colors={['#ff7c2a', '#cc5500']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryButtonGradient}
                    >
                        <FontAwesome5
                            name={'cog' as any}
                            size={iconSize.sm}
                            color={colors.textPrimary}
                            iconStyle="solid"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.primaryButtonText}>Open Settings</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleGoHome}
                    accessibilityRole="button"
                    accessibilityLabel="Go to Home"
                    style={styles.secondaryButton}
                >
                    <Text style={styles.secondaryButtonText}>Go to Home</Text>
                </TouchableOpacity>

            </View>
        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    root: {
        flex:            1,
        backgroundColor: colors.surface0,
    },
    content: {
        flex:           1,
        alignItems:     'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconWrapper: {
        width:           88,
        height:          88,
        borderRadius:    44,
        backgroundColor: 'rgba(255,124,42,0.1)',
        borderWidth:     1,
        borderColor:     'rgba(255,124,42,0.25)',
        justifyContent:  'center',
        alignItems:      'center',
        marginBottom:    28,
    },
    title: {
        fontSize:      fontSizes.headline,
        fontWeight:    '800',
        color:         colors.textPrimary,
        textAlign:     'center',
        marginBottom:  12,
        letterSpacing: 0.2,
    },
    body: {
        fontSize:     fontSizes.body,
        color:        colors.textSecondary,
        textAlign:    'center',
        lineHeight:   23,
        marginBottom: 40,
    },
    primaryButton: {
        width:        width - 64,
        borderRadius: radius.lg,
        overflow:     'hidden',
        marginBottom: 12,
    },
    primaryButtonGradient: {
        flexDirection:     'row',
        alignItems:        'center',
        justifyContent:    'center',
        paddingVertical:   16,
        paddingHorizontal: 32,
    },
    primaryButtonText: {
        color:      colors.textPrimary,
        fontSize:   fontSizes.body,
        fontWeight: '700',
    },
    secondaryButton: {
        paddingVertical:   14,
        paddingHorizontal: 32,
        borderRadius:      radius.lg,
        borderWidth:       1,
        borderColor:       colors.border,
        backgroundColor:   colors.surface1,
    },
    secondaryButtonText: {
        color:      colors.textSecondary,
        fontSize:   fontSizes.body,
        fontWeight: '500',
    },
});

export default ContentBlocked;