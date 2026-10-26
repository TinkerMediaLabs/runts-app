import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Hand-picked lists: each story is fetched by id under the same cache key as the story page, so it is
// shared with (and saved for offline like) everything else that loads that story. Stories that are not
// live, or no longer exist, are dropped; the order of `ids` is kept.
export function useStoriesByIds(ids: string[]) {
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: ['story', id],
      queryFn: async () => {
        const client = generateClient<Schema>();
        const { data, errors } = await client.models.Story.get({ id });
        if (errors) throw new Error(errors[0].message);
        return data;
      },
      staleTime: 1000 * 60 * 5,
      enabled: !!id,
    })),
  });
  const stamp = results.map(r => r.dataUpdatedAt).join(',');
  const stories = useMemo(
    () => results.map(r => r.data).filter((s: any) => !!s && s.live === 'true') as any[],
    [stamp],
  );
  return { stories, isLoading: results.some(r => r.isLoading) };
}
