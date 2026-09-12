import React from 'react';
import { View, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';

import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../../theme/spacing';
import { useStoryImage } from '../../hooks/queries/useStoryImage';

const CARD_WIDTH  = 200;
const CARD_HEIGHT = 240;

// ---------------------------------------------------------------------------
// Component — horizontal tag tile, matching HorzStoryTile's visual style.
// Tags without a hero image fall back to a dark gray card.
// ---------------------------------------------------------------------------

const HorzTagTile = ({
    id,
    name,
    heroImageUri,
    storyCount,
}: any) => {

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const { data: resolvedImageUri } = useStoryImage(
        heroImageUri?.startsWith('stories/') ? heroImageUri : null
    );
    const displayImageUri = resolvedImageUri ?? heroImageUri;

    const countLabel = `${storyCount ?? 0} ${(storyCount ?? 0) === 1 ? 'story' : 'stories'}`;

    return (
        <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('TagHomeScreen', { id, name })}
            style={styles.wrapper}
        >
            {displayImageUri ? (
                <ImageBackground
                    source={{ uri: displayImageUri }}
                    style={styles.card}
                    imageStyle={styles.cardImage}
                >
                    <LinearGradient
                        colors={[
                            'transparent',
                            'rgba(0,0,0,0.3)',
                            'rgba(0,0,0,0.82)',
                            'rgba(0,0,0,0.97)',
                        ]}
                        locations={[0.2, 0.45, 0.75, 1]}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                    />

                    <View style={styles.info}>
                        <Text style={styles.title} numberOfLines={2}>
                            {name}
                        </Text>
                        <Text style={styles.countText}>{countLabel}</Text>
                    </View>
                </ImageBackground>
            ) : (
                <View style={[styles.card, styles.cardFallback]}>
                    <View style={styles.info}>
                        <Text style={styles.title} numberOfLines={2}>
                            {name}
                        </Text>
                        <Text style={styles.countText}>{countLabel}</Text>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    wrapper: {
        marginLeft: spacing.margin,
    },
    card: {
        width:           CARD_WIDTH,
        height:          CARD_HEIGHT,
        borderRadius:    14,
        overflow:        'hidden',
        justifyContent:  'flex-end',
        backgroundColor: '#1c1c1c',
        borderWidth:     0.5,
        borderColor:     'rgba(255,255,255,0.1)',
    },
    cardImage: {
        borderRadius: 14,
    },
    cardFallback: {
        backgroundColor: '#2a2a2a',
    },

    info: {
        paddingHorizontal: 10,
        paddingBottom:     10,
        gap:               5,
    },
    title: {
        fontSize:   20,
        fontWeight: '700',
        color:      '#fff',
        lineHeight: 18,
        flexShrink: 1,
    },
    countText: {
        fontSize:   11,
        color:      'rgba(255,255,255,0.5)',
        fontWeight: '600',
    },
});

export default HorzTagTile;
