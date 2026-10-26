import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// The newest live stories of one author for the Home "Featured author" row: one query on the author's
// published-date index (which also holds drafts, so a few extra rows are read and drafts are dropped).
export function useAuthorNewest(authorId: string | null | undefined, limit: number = 10) {
  return useQuery({
    queryKey: ['stories', 'authorNewest', authorId, limit],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const res: any = await (client.models.Story as any).listStoryByAuthorIdAndPublishedAt(
        { authorId }, { sortDirection: 'DESC', limit: Math.max(30, limit * 3) });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return ((res.data ?? []) as any[]).filter(s => s.live === 'true').slice(0, limit);
    },
    enabled: !!authorId,
    staleTime: 1000 * 60 * 5,
  });
}
