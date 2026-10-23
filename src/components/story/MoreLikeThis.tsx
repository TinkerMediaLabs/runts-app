import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';

import HorizontalList from './HorizontalList';
import { useApp } from '@/context/AppContext';
import { useRecommendations } from '../../hooks/queries/useRecommendations';
import { useTag } from '../../hooks/queries/useTagNames';
import { spacing } from '../../theme/spacing';

type Props = {
    story: any;
};

// "More like this" rail for the story page. Built from indexed queries only (see useRecommendations),
// so it costs the same with 7 stories or 7,000. Renders nothing until there is something to show.
const MoreLikeThis = ({ story }: Props) => {
    const { eroticEnabled } = useApp();
    const { items } = useRecommendations(story, eroticEnabled, 12);
    const { data: primaryTag } = useTag(story?.primaryTagId);

    if (!items.length) return null;

    const nextPart = items.find((i: any) => i.reason === 'next-part');

    return (
        <View style={styles.wrap}>
            <Text style={styles.label} accessibilityRole="header">
                {nextPart ? 'Continue the series' : 'More like this'}
            </Text>
            <View style={styles.rail}>
                <HorizontalList
                    stories={items}
                    tagId={story?.primaryTagId ?? undefined}
                    tagName={primaryTag?.name ?? undefined}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        marginTop: 8,
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
    },
    // The story page content card has horizontal padding; let the rail run edge to edge.
    rail: {
        marginHorizontal: -spacing.margin,
        paddingLeft: spacing.margin,
    },
});

export default MoreLikeThis;
