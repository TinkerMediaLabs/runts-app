import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient<Schema>();

// ---------------------------------------------------------------------------
// Main Continue Listening — NEVER shows erotic stories.
// Erotic in-progress stories appear only on the Erotic Home screen via
// useEroticInProgressStories below.
// ---------------------------------------------------------------------------

export function useInProgressStories() {
    return useQuery({
        queryKey: ['inProgressStories'],
        queryFn: async () => {
            const { userId } = await getCurrentUser();
            const { data, errors } = await client.models.UserInProgressStory.list({
                filter: { userId: { eq: userId } },
            });
            if (errors) throw new Error(errors[0].message);

            const sorted = [...(data ?? [])].sort((a, b) =>
                new Date(b.lastListenedAt ?? 0).getTime() -
                new Date(a.lastListenedAt ?? 0).getTime()
            );

            // Fetch story data to filter out erotic — done in parallel
            const storyResults = await Promise.all(
                sorted.map(r => client.models.Story.get({ id: r.storyId }))
            );

            // Keep only non-erotic stories
            return sorted.filter(
                (_, i) => storyResults[i]?.data?.isErotic !== 'true'
            );
        },
        staleTime: 1000 * 60 * 2,
    });
}

// ---------------------------------------------------------------------------
// Erotic Continue Listening — only erotic in-progress stories.
// Used exclusively by the Erotic Home screen component.
// ---------------------------------------------------------------------------

export function useEroticInProgressStories() {
    return useQuery({
        queryKey: ['eroticInProgressStories'],
        queryFn: async () => {
            const { userId } = await getCurrentUser();
            const { data, errors } = await client.models.UserInProgressStory.list({
                filter: { userId: { eq: userId } },
            });
            if (errors) throw new Error(errors[0].message);

            const sorted = [...(data ?? [])].sort((a, b) =>
                new Date(b.lastListenedAt ?? 0).getTime() -
                new Date(a.lastListenedAt ?? 0).getTime()
            );

            // Fetch story data to keep only erotic
            const storyResults = await Promise.all(
                sorted.map(r => client.models.Story.get({ id: r.storyId }))
            );

            return sorted.filter(
                (_, i) => storyResults[i]?.data?.isErotic === 'true'
            );
        },
        staleTime: 1000 * 60 * 2,
    });
}

// ---------------------------------------------------------------------------
// Upsert in-progress story (create or update)
// ---------------------------------------------------------------------------

export async function upsertInProgressStory(
    storyId: string,
    progressSeconds: number
) {
    const { userId } = await getCurrentUser();
    const client2 = generateClient<Schema>();

    const { data: existing } = await client2.models.UserInProgressStory.list({
        filter: {
            and: [
                { userId: { eq: userId } },
                { storyId: { eq: storyId } },
            ],
        },
    });

    if (existing?.length) {
        await client2.models.UserInProgressStory.update({
            id:              existing[0].id,
            progressSeconds: Math.floor(progressSeconds),
            lastListenedAt:  new Date().toISOString(),
        });
    } else {
        await client2.models.UserInProgressStory.create({
            userId,
            storyId,
            progressSeconds: Math.floor(progressSeconds),
            lastListenedAt:  new Date().toISOString(),
        });
    }
}

// ---------------------------------------------------------------------------
// Delete in-progress story
// ---------------------------------------------------------------------------

export function useDeleteInProgressStory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (storyId: string) => {
            const { userId } = await getCurrentUser();
            const { data: existing } = await client.models.UserInProgressStory.list({
                filter: {
                    and: [
                        { userId: { eq: userId } },
                        { storyId: { eq: storyId } },
                    ],
                },
            });
            if (existing?.length) {
                await client.models.UserInProgressStory.delete({ id: existing[0].id });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inProgressStories'] });
            queryClient.invalidateQueries({ queryKey: ['eroticInProgressStories'] });
        },
    });
}

// ---------------------------------------------------------------------------
// Get progress seconds for a specific story
// ---------------------------------------------------------------------------

export async function getInProgressSeconds(storyId: string): Promise<number> {
    const { userId } = await getCurrentUser();
    const client2 = generateClient<Schema>();
    const { data } = await client2.models.UserInProgressStory.list({
        filter: {
            and: [
                { userId: { eq: userId } },
                { storyId: { eq: storyId } },
            ],
        },
    });
    return data?.[0]?.progressSeconds ?? 0;
}