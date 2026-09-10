import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';



// ---------------------------------------------------------------------------
// Fetches all live erotic stories sorted by newest first.
// Paginates through ALL pages of the byLiveAndPublishedAt GSI rather than
// relying on the general useStories hook which has a page size limit.
// ---------------------------------------------------------------------------

export function useEroticStories() {
    return useQuery({
        queryKey: ['eroticStories'],
queryFn: async () => {
      const client = generateClient<Schema>();
    try {
    let allStories: any[] = [];
        let nextToken: string | null = null;

        do {
            const { data, nextToken: next }: { data: any[]; nextToken: string | null } = await (client.models.Story as any)
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
        return filtered;
    } catch (err) {
        console.error('useEroticStories queryFn error:', err);
        throw err;
    }
},
        staleTime: 1000 * 60 * 5,
    });
}