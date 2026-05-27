import React from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/types';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import HorzStoryTile from './HorizontalTile';
import { spacing } from '../../theme/spacing';

const CARD_WIDTH    = 200;
const CARD_MARGIN   = spacing.margin;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN;

type HorizontalListProps = {
    stories: any[];
    tagId?: string;
    tagName?: string;
};

const HorizontalList = ({ stories, tagId, tagName }: HorizontalListProps) => {

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const SeeMore = () => (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('TagHomeScreen', {
                id: tagId ?? '',
                name: tagName ?? '',
            })}
            style={styles.seeMore}
        >
            <View style={styles.seeMoreBubble}>
                <FontAwesome5
                    name="chevron-right"
                    size={20}
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
            audioUri={item.audioUri}
            summary={item.summary}
            description={item.description}
            duration={item.duration}
            numListens={item.numListens}
            credit={item.credit}
            nsfw={item.nsfw}
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
                ListFooterComponent={<SeeMore />}
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
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    seeMoreText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#888',
        textAlign: 'center',
    },
});

export default HorizontalList;