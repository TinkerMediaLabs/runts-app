import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';

import HorizontalList from './HorizontalList';
import { useApp } from '@/context/AppContext';
import { useStory } from '../../hooks/queries/useStories';
import { useRecommendations } from '../../hooks/queries/useRecommendations';
import { useTag } from '../../hooks/queries/useTagNames';
import { spacing } from '../../theme/spacing';
import SectionTitle from '@/components/common/SectionTitle';

const MIN_ITEMS = 3;

// The listener's most recently finished story: ONE row from the finished-by-date index, newest first.
function useLatestFinishedStoryId() {
    return useQuery({
        queryKey: ['finishedStories', 'latest'],
        queryFn: async () => {
            const client = generateClient<Schema>();
            const { userId } = await getCurrentUser();
            const res: any = await (client.models.UserFinishedStory as any).listUserFinishedStoryByUserIdAndFinishedAt(
                { userId }, { sortDirection: 'DESC', limit: 1 });
            return (res.data?.[0]?.storyId ?? null) as string | null;
        },
        staleTime: 1000 * 60 * 5,
    });
}

// Home rail: "Because you finished X". Uses the same indexed, tag/universe/author-based recommendations
// as the story page, seeded by the last story finished, so its cost does not grow with the catalog.
// Renders nothing until the listener has finished a story and there are enough fresh suggestions.
const BecauseYouFinished = () => {
    const { eroticEnabled } = useApp();
    const { data: storyId } = useLatestFinishedStoryId();
    const { data: story } = useStory(storyId ?? '');
    const { items } = useRecommendations(story, eroticEnabled, 12);
    const { data: primaryTag } = useTag(story?.primaryTagId);

    if (!story || items.length < MIN_ITEMS) return null;

    return (
        <View style={styles.wrap}>
            <SectionTitle text={`Because you finished ${story.title}`} numberOfLines={1} />
            <HorizontalList
                stories={items}
                tagId={story.primaryTagId ?? undefined}
                tagName={primaryTag?.name ?? undefined}
            />
        </View>
    );
};

export default BecauseYouFinished;

const styles = StyleSheet.create({
    wrap: { paddingBottom: spacing.margin },
});
