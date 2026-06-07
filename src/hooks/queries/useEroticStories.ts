import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

// ---------------------------------------------------------------------------
// Fetches all live erotic stories sorted by newest first.
// Paginates through ALL pages of the byLiveAndPublishedAt GSI rather than
// relying on the general useStories hook which has a page size limit.
// ---------------------------------------------------------------------------

export function useEroticStories() {
    return useQuery({
        queryKey: ['eroticStories'],
queryFn: async () => {
    const { data: allData } = await client.models.Story.list();
console.log('total stories in table:', allData?.length);
console.log('erotic in table:', allData?.filter(s => s.isErotic === 'true')?.length);
    try {
        let allStories: any[] = [];
        let nextToken: string | null = null;

        do {
            const { data, nextToken: next } = await (client.models.Story as any)
                .listStoryByLiveAndPublishedAt(
                    { live: 'true' },
                    {
                        sortDirection: 'DESC',
                        limit:         100,
                        nextToken,
                    }
                );
            allStories = [...allStories, ...(data ?? [])];
            nextToken  = next ?? null;
        } while (nextToken);

        const filtered = allStories.filter(s => s.isErotic === 'true');
        console.log('total fetched:', allStories.length, 'erotic:', filtered.length);
        return filtered;
    } catch (err) {
        console.error('useEroticStories queryFn error:', err);
        throw err;
    }
},
        staleTime: 1000 * 60 * 5,
    });
}