import { useState, useRef } from 'react';
import {
    TouchableOpacity,
    View,
    Text,
    StyleSheet,
    Animated,
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/types';
import { Analytics } from '@/lib/analytics';

const VISIBLE_COUNT = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pick(tags: any[]): any[] {
    return shuffle(tags).slice(0, VISIBLE_COUNT);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PopularTagsList = ({ tags }: { tags: any[] }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    // Only minor (non-primary) tags
    const minorTags = tags.filter(t => !t.isPrimary);

    const [visible, setVisible]   = useState<any[]>(() => pick(minorTags));
    const [spinning, setSpinning] = useState(false);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;

    // Nothing to show
    if (minorTags.length === 0) return null;

    const handleRefresh = () => {
        if (spinning) return;
        setSpinning(true);

        // Spin the icon
        spinAnim.setValue(0);
        Animated.timing(spinAnim, {
            toValue:         1,
            duration:        400,
            useNativeDriver: true,
        }).start(() => setSpinning(false));

        // Fade out → swap tags → fade in
        Animated.timing(fadeAnim, {
            toValue:         0,
            duration:        140,
            useNativeDriver: true,
        }).start(() => {
            setVisible(pick(minorTags));
            Animated.timing(fadeAnim, {
                toValue:         1,
                duration:        200,
                useNativeDriver: true,
            }).start();
        });
    };

    const handlePress = (id: string, name: string) => {
        Analytics.genreTapped(id, name);
        navigation.navigate('TagHomeScreen', { id, name });
    };

    const spin = spinAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Explore Subgenres</Text>
                    {/* <Text style={styles.subtitle}>
                        {minorTags.length} subgenres · showing {Math.min(VISIBLE_COUNT, minorTags.length)}
                    </Text> */}
                </View>

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleRefresh}
                    style={styles.refreshBtn}
                    disabled={spinning}
                >
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <FontAwesome5
                            name={'sync-alt' as any}
                            size={12}
                            color="cyan"
                            iconStyle="solid"
                        />
                    </Animated.View>
                    <Text style={styles.refreshText}>Shuffle</Text>
                </TouchableOpacity>
            </View>

            {/* Tag chips */}
            <Animated.View style={[styles.chipWrap, { opacity: fadeAnim }]}>
                {visible.map(tag => (
                    <TouchableOpacity
                        key={tag.id}
                        activeOpacity={0.7}
                        onPress={() => handlePress(tag.id, tag.name)}
                        style={styles.chip}
                    >
                        <Text style={styles.chipText}>#{tag.name}</Text>
                    </TouchableOpacity>
                ))}
            </Animated.View>

        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        gap:       12,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        flexDirection:  'row',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
    },
    title: {
        fontSize:   18,
        fontWeight: 'bold',
        color:      '#fff',
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 11,
        color:    'rgba(255,255,255,0.3)',
    },
    refreshBtn: {
        flexDirection:     'row',
        alignItems:        'center',
        gap:               6,
        paddingHorizontal: 12,
        paddingVertical:   7,
        borderRadius:      20,
        backgroundColor:   'rgba(0,255,255,0.07)',
        borderWidth:       StyleSheet.hairlineWidth,
        borderColor:       'rgba(0,255,255,0.25)',
    },
    refreshText: {
        fontSize:   12,
        fontWeight: '600',
        color:      'cyan',
    },

    // ── Chips ─────────────────────────────────────────────────────────────────
    chipWrap: {
        flexDirection: 'row',
        flexWrap:      'wrap',
        gap:           8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical:   7,
        borderRadius:      20,
        backgroundColor:   'rgba(255,255,255,0.05)',
        borderWidth:       StyleSheet.hairlineWidth,
        borderColor:       'rgba(255,255,255,0.15)',
    },
    chipText: {
        fontSize:   13,
        color:      'rgba(255,255,255,0.6)',
        fontWeight: '500',
    },
});

export default PopularTagsList;