import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ImageBackground,
    StyleSheet,
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { LinearGradient } from 'expo-linear-gradient';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';

import LoadingItem from '../common/LoadingItem';
import { spacing } from '../../theme/spacing';
import { useStoryImage } from '../../hooks/queries/useStoryImage';

const CARD_WIDTH  = 200;
const CARD_HEIGHT = 220;

const HorzStoryTile = ({
    title,
    primaryTagName,
    imageUri,
    id,
    numListens,
    duration,
}: any) => {

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    // Resolve S3 path to signed URL if needed
    const { data: resolvedImageUri } = useStoryImage(
        imageUri?.startsWith('stories/') ? imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? imageUri;

    return (
        <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('StoryScreen', { storyID: id })}
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
                            'rgba(0,0,0,0.55)',
                            'rgba(0,0,0,0.9)',
                        ]}
                        locations={[0.25, 0.6, 1]}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                    />

                    <View style={styles.info}>
                        <Text style={styles.title} numberOfLines={3}>
                            {title}
                        </Text>

                        <View style={styles.meta}>
                            <Text style={styles.tag}>{primaryTagName}</Text>
                            <View style={styles.listens}>
                                <FontAwesome5
                                    name="headphones"
                                    size={10}
                                    color="rgba(255,255,255,0.6)"
                                    iconStyle="solid"
                                />
                                <Text style={styles.listensText}>
                                    {numListens ?? 0}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ImageBackground>
            ) : (
                <LoadingItem height={CARD_HEIGHT} width={CARD_WIDTH} radius={14} />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginLeft: spacing.margin,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        backgroundColor: '#1c1c1c',
    },
    cardImage: {
        borderRadius: 14,
    },
    info: {
        paddingHorizontal: 10,
        paddingBottom: 10,
        gap: 4,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        lineHeight: 18,
        flexShrink: 1,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tag: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'capitalize',
        flex: 1,
    },
    listens: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    listensText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
    },
});

export default HorzStoryTile;