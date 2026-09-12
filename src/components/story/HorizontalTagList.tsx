import React from 'react';
import { View, FlatList } from 'react-native';

import HorzTagTile from './HorizontalTagTile';
import { spacing } from '../../theme/spacing';

const CARD_WIDTH    = 200;
const CARD_MARGIN   = spacing.margin;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN;

// ---------------------------------------------------------------------------
// HorizontalTagList — horizontal scroller for tags, matching HorizontalList's
// story pattern. No "See More" footer.
// ---------------------------------------------------------------------------

type HorizontalTagListProps = {
    tags: any[];
};

const HorizontalTagList = ({ tags }: HorizontalTagListProps) => {

    const renderItem = ({ item }: any) => (
        <HorzTagTile
            id={item.id}
            name={item.name}
            heroImageUri={item.heroImageUri}
            storyCount={item.storyCount}
        />
    );

    return (
        <View>
            <FlatList
                data={tags}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                maxToRenderPerBatch={8}
                snapToInterval={SNAP_INTERVAL}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={{ paddingRight: spacing.margin }}
            />
        </View>
    );
};

export default HorizontalTagList;
