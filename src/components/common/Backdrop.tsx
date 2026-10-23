import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Subtle depth behind a screen: a faint cyan haze at the top that falls off into black, plus a soft
// vignette at the bottom. Static (no animation), so it costs nothing on older phones.
export default function Backdrop() {
    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <LinearGradient
                colors={['rgba(0,255,255,0.08)', 'rgba(0,255,255,0.02)', 'transparent']}
                locations={[0, 0.45, 1]}
                style={styles.haze}
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)']}
                style={styles.vignette}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    haze: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
    vignette: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 260 },
});
