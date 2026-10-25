import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/common/AppText';
import Reveal from '../common/Reveal';
import HorizontalList from './HorizontalList';
import { useStoriesByTagTrending } from '../../hooks/queries/useStories';
import { useEnrichedStories } from '../../hooks/queries/useEnrichedStories';
import useTypography from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// One Home row: the most-listened live stories of a genre, from the genre's own index (not filtered out of
// a global list), so it stays full as the catalog grows. Renders nothing when the genre has no stories.
const TagRow = ({ tag, index }: { tag: { id: string; name?: string | null }; index: number }) => {
    const typo = useTypography();
    const { data } = useStoriesByTagTrending(tag.id);
    const { stories } = useEnrichedStories(data);
    if (stories.length === 0) return null;
    return (
        <Reveal index={index}>
            <View style={{ marginLeft: spacing.margin, paddingVertical: spacing.margin }}>
                <Text style={typo.title} accessibilityRole="header">{tag.name}</Text>
            </View>
            <HorizontalList stories={stories} tagId={tag.id} tagName={tag.name ?? ''} />
        </Reveal>
    );
};

export default TagRow;
