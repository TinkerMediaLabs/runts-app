import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const ContentBlocked = () => {
    const navigation = useNavigation<any>();
    const insets     = useSafeAreaInsets();

    const handleGoToSettings = () => {
        // Navigate to settings and close this screen
        navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
        });
        // Small delay so the tab navigator is mounted before pushing settings
        setTimeout(() => {
            navigation.navigate('AppSettings');
        }, 100);
    };

    const handleGoHome = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
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
                            size={14}
                            color="#fff"
                            iconStyle="solid"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.primaryButtonText}>Open Settings</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleGoHome}
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
        backgroundColor: '#000',
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
        fontSize:      26,
        fontWeight:    '800',
        color:         '#fff',
        textAlign:     'center',
        marginBottom:  12,
        letterSpacing: 0.2,
    },
    body: {
        fontSize:     15,
        color:        'rgba(255,255,255,0.5)',
        textAlign:    'center',
        lineHeight:   23,
        marginBottom: 40,
    },
    primaryButton: {
        width:        width - 64,
        borderRadius: 14,
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
        color:      '#fff',
        fontSize:   16,
        fontWeight: '700',
    },
    secondaryButton: {
        paddingVertical:   14,
        paddingHorizontal: 32,
        borderRadius:      14,
        borderWidth:       1,
        borderColor:       '#2a2a2a',
        backgroundColor:   '#111',
    },
    secondaryButtonText: {
        color:      'rgba(255,255,255,0.5)',
        fontSize:   15,
        fontWeight: '500',
    },
});

export default ContentBlocked;