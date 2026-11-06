import React from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Text } from '@/components/common/AppText';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import HorzStoryTile from './HorizontalTile';
import { spacing } from '../../theme/spacing';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

const CARD_WIDTH    = 200;
const CARD_MARGIN   = spacing.margin;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN;

type HorizontalListProps = {
    stories: any[];
    tagId?: string;
    tagName?: string;
    showSeeMore?: boolean;   // default true when a genre is given
};

const HorizontalList = ({ stories, tagId, tagName, showSeeMore }: HorizontalListProps) => {

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { width: screenWidth } = useWindowDimensions();
    const withSeeMore = showSeeMore ?? !!tagId;
    // Empty space after the last tile so it can scroll all the way to the left edge and lock there.
    const endSpace = Math.max(spacing.margin, screenWidth - SNAP_INTERVAL);

    const SeeMore = () => (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('TagHomeScreen', {
                id: tagId ?? '',
                name: tagName ?? '',
            })}
            style={styles.seeMore}
            accessibilityRole="button"
            accessibilityLabel={tagName ? `See more ${tagName} stories` : 'See more stories'}
        >
            <View style={styles.seeMoreBubble}>
                <FontAwesome5
                    name="chevron-right"
                    size={iconSize.md}
                    color="#888"
                    iconStyle="solid"
                />
            </View>
            <Text style={styles.seeMoreText}>See More</Text>
        </TouchableOpacity>
    );

    const renderItem = ({ item }: any) => (
        <HorzStoryTile
            id={item.id}
            title={item.title}
            imageUri={item.imageUri}
            primaryTagName={item.primaryTagName}
            secondaryTagName={item.secondaryTagName}
            author={item.authorName}
            audioUri={item.audioUri}
            summary={item.summary}
            description={item.description}
            duration={item.duration}
            spiceRating={item.spiceRating}
            numListens={item.numListens}
            credit={item.credit}
            nsfw={item.nsfw}
            isNew={item.isNew}
            progressStatus={item.progressStatus}
            progressSeconds={item.progressSeconds}
        />
    );

    return (
        <View>
            <FlatList
                data={stories}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                maxToRenderPerBatch={8}
                snapToInterval={SNAP_INTERVAL}
                snapToAlignment="start"
                decelerationRate="fast"
                ListFooterComponent={withSeeMore ? <SeeMore /> : <View style={{ width: endSpace }} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    seeMore: {
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.margin,
        width: 72,
        height: 220,
    },
    seeMoreBubble: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.surface3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    seeMoreText: {
        fontSize: fontSizes.caption,
        fontWeight: '500',
        color: '#888',
        textAlign: 'center',
    },
});

export default HorizontalList;