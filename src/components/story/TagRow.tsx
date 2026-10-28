import React from 'react';
import { View } from 'react-native';
import Reveal from '../common/Reveal';
import HorizontalList from './HorizontalList';
import { useStoriesByTagTrending } from '../../hooks/queries/useStories';
import { useEnrichedStories } from '../../hooks/queries/useEnrichedStories';
import SectionTitle from '@/components/common/SectionTitle';

// One Home row: the most-listened live stories of a genre, from the genre's own index (not filtered out of
// a global list), so it stays full as the catalog grows. Renders nothing when the genre has no stories.
const TagRow = ({ tag, index }: { tag: { id: string; name?: string | null }; index: number }) => {
    const { data } = useStoriesByTagTrending(tag.id);
    const { stories } = useEnrichedStories(data);
    if (stories.length === 0) return null;
    return (
        <Reveal index={index}>
            <SectionTitle text={tag.name ?? ''} />
            <HorizontalList stories={stories} tagId={tag.id} tagName={tag.name ?? ''} />
        </Reveal>
    );
};

export default TagRow;
