import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    ImageBackground,
    TouchableOpacity,
} from 'react-native';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Easing,
} from 'react-native-reanimated';

import Carousel from 'react-native-reanimated-carousel';
import { LinearGradient } from 'expo-linear-gradient';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import FontAwesome  from '@react-native-vector-icons/fontawesome';
import AntDesign    from '@react-native-vector-icons/ant-design';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';

import PlayButtonV2 from '../common/PlayButtonV2';
import LoadingItem  from '../common/LoadingItem';
import { useStoryImage } from '../../hooks/queries/useStoryImage';

import PinButton from '../common/PinButton';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width, height } = Dimensions.get('window');

const CARD_WIDTH  = width * 0.9;
const CARD_HEIGHT = height * 0.40;
const EXPAND_H    = 130;
const TIMING_CFG  = { duration: 200, easing: Easing.out(Easing.quad) };

// ---------------------------------------------------------------------------
// CarouselItem
// ---------------------------------------------------------------------------

type ItemProps = {
    id: string;
    title: string;
    primaryTagName: string;
    summary: string;
    imageUri: string;
    audioUri: string;
    author: string;
    duration: number;
    numListens: number;
};

const CarouselItem = ({
    id, title, primaryTagName, summary,
    imageUri, audioUri, author, duration, numListens,
}: ItemProps) => {

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const [isFav, setIsFav] = useState(false);

    // Resolve S3 path to signed URL if needed
    const { data: resolvedImageUri } = useStoryImage(
        imageUri?.startsWith('stories/') ? imageUri : null
    );
    const displayImageUri = resolvedImageUri ?? imageUri;

    const expandProgress = useSharedValue(0);
    const isExpanded     = useSharedValue(false);

    const toggleExpand = () => {
        const next = !isExpanded.value;
        isExpanded.value = next;
        expandProgress.value = withTiming(next ? 1 : 0, TIMING_CFG);
    };

    const expandStyle = useAnimatedStyle(() => ({
        height:  interpolate(expandProgress.value, [0, 1], [0, EXPAND_H]),
        opacity: interpolate(expandProgress.value, [0, 0.3], [0, 1]),
    }));

    const gradientStyle = useAnimatedStyle(() => ({
        height: interpolate(expandProgress.value, [0, 1], [CARD_HEIGHT * 0.72, CARD_HEIGHT]),
    }));

    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${interpolate(expandProgress.value, [0, 1], [0, 180])}deg` }],
    }));

    return (
        <View style={styles.itemWrapper}>
            {displayImageUri ? (
                <ImageBackground
                    source={{ uri: displayImageUri }}
                    style={styles.card}
                    imageStyle={styles.cardImage}
                >
                    <Animated.View
                        style={[styles.gradientContainer, gradientStyle]}
                        pointerEvents="none"
                    >
                        <LinearGradient
                            colors={[
                                'transparent',
                                'rgba(0,0,0,0.5)',
                                'rgba(0,0,0,0.85)',
                                'rgba(0,0,0,0.97)',
                            ]}
                            locations={[0, 0.35, 0.65, 1]}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('StoryScreen', { storyID: id })}
                        style={styles.imageTap}
                        activeOpacity={1}
                    />

                    <TouchableOpacity
                        onPress={toggleExpand}
                        activeOpacity={0.9}
                        style={styles.infoPanel}
                    >
                        <View style={styles.titleRow}>
                            <Text style={styles.title} numberOfLines={2}>{title}</Text>
                            <Animated.View style={[styles.chevron, chevronStyle]}>
                                <FontAwesome5
                                    name="chevron-down"
                                    size={13}
                                    color="rgba(255,255,255,0.7)"
                                    iconStyle="solid"
                                />
                            </Animated.View>
                        </View>

                        <View style={styles.metaRow}>
                            <FontAwesome5
                                name="book-open"
                                size={11}
                                color="rgba(255,255,255,0.7)"
                                iconStyle="solid"
                            />
                            <Text style={styles.metaText}>{author}</Text>
                        </View>

                        <View style={styles.metaRow}>
                            <Text style={styles.tag}>{primaryTagName}</Text>
                            <View style={styles.metaDot} />
                            <FontAwesome5
                                name="headphones"
                                size={11}
                                color="rgba(255,255,255,0.6)"
                                iconStyle="solid"
                            />
                            <Text style={styles.metaText}>{numListens ?? 0}</Text>
                        </View>

                        <Animated.View style={[styles.expandClip, expandStyle]}>
                            <View style={styles.expandInner}>
                                <Text style={styles.summary} numberOfLines={3}>
                                    {summary}
                                </Text>

                                <View style={styles.actions}>
                                    <PlayButtonV2
                                        id={id}
                                        duration={duration}
                                        author={author}
                                        audioUri={audioUri}
                                        imageUri={displayImageUri}
                                    />

                                    <View style={styles.iconActions}>
                                        <PinButton storyId={id} size={20} />

                                        <TouchableOpacity
                                            onPress={() => setIsFav(f => !f)}
                                            style={styles.iconBtn}
                                            activeOpacity={0.7}
                                        >
                                            <FontAwesome5
                                                name="star"
                                                size={19}
                                                color={isFav ? '#C9A84C' : 'rgba(255,255,255,0.75)'}
                                                iconStyle={isFav ? 'solid' : 'regular'}
                                            />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.iconBtn}
                                            activeOpacity={0.7}
                                        >
                                            <FontAwesome
                                                name="share"
                                                size={19}
                                                color="rgba(255,255,255,0.75)"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    </TouchableOpacity>

                </ImageBackground>
            ) : (
                <LoadingItem width={CARD_WIDTH} height={CARD_HEIGHT} radius={15} />
            )}
        </View>
    );
};

// ---------------------------------------------------------------------------
// ForYouCarousel
// ---------------------------------------------------------------------------

const ForYouCarousel = ({ stories, tagMap }: { stories: any[]; tagMap: Record<string, string> }) => {

    const renderItem = ({ item }: any) => (
        <CarouselItem
            id={item?.id}
            title={item?.title}
            imageUri={item?.imageUri ?? ''}
            primaryTagName={item?.primaryTagName ?? ''}
            audioUri={item?.audioUri ?? ''}
            summary={item?.summary ?? ''}
            author={item?.authorName ?? ''}
            duration={item?.duration ?? 0}
            numListens={item?.numListens ?? 0}
        />
    );

    return (
        <View style={styles.container}>
            <Carousel
                data={stories ?? []}
                renderItem={renderItem}
                width={width}
                height={CARD_HEIGHT}
                scrollAnimationDuration={1000}
                pagingEnabled
                snapEnabled
                mode="parallax"
                modeConfig={{
                    parallaxScrollingScale: 1,
                    parallaxScrollingOffset: 76,
                    parallaxAdjacentItemScale: 0.8,
                }}
                style={{ width }}
            />
        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    container: {
        alignItems: 'center',
        marginTop: 20,
    },

    itemWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 15,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        backgroundColor: '#171717',
    },
    cardImage: {
        borderRadius: 15,
    },

    gradientContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },

    imageTap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 100,
    },

    infoPanel: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 10,
    },

    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginRight: 8,
    },
    chevron: {
        paddingTop: 3,
    },

    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 4,
    },
    metaText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
    },
    tag: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
        textTransform: 'capitalize',
    },
    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },

    expandClip: {
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    expandInner: {
        paddingVertical: 10,
        gap: 10,
        height: '100%',
        justifyContent: 'space-between'
    },
    summary: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.82)',
        lineHeight: 19,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconActions: {
        flexDirection: 'row',
        gap: 18,
    },
    iconBtn: {
        padding: 4,
    },
});

export default ForYouCarousel;