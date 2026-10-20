import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

async function fetchAuthorName(id: string) {
  const client = generateClient<Schema>();
  const { data } = await client.models.Author.get({ id });
  return { id, name: data?.name ?? '' };
}

// Resolve a set of author IDs to an { id: name } map.
// Only fetches authors actually referenced by the caller (one cached get per
// distinct id) - never lists the Author table. Cost depends on how many
// authors are visible on screen, not on how many exist.
//
// Usage:
//   const { data: authorMap } = useAuthorNames(stories?.map(s => s.authorId));
export function useAuthorNames(authorIds: (string | null | undefined)[]) {
  const uniqueIds = useMemo(
    () => Array.from(new Set(authorIds.filter((id): id is string => !!id))),
    [authorIds.join(',')] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const results = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: ['authorName', id],
      queryFn: () => fetchAuthorName(id),
      staleTime: 1000 * 60 * 30,
    })),
  });

  const authorMap = useMemo(() => {
    const map: Record<string, string> = {};
    results.forEach((r) => {
      if (r.data && r.data.name) map[r.data.id] = r.data.name;
    });
    return map;
  }, [results]);

  const isLoading = results.some((r) => r.isLoading);

  return { data: authorMap, isLoading };
}
