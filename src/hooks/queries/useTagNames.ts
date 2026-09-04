import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

async function fetchTag(id: string) {
  const client = generateClient<Schema>();
  const { data } = await client.models.Tag.get({ id });
  return { id, name: data?.name ?? '' };
}

// ─── Single tag, individually cached ──────────────────────────────────────
// Shares its cache entry with useTagNames() below, keyed by tag id — so a
// tag fetched anywhere in the app is instantly available everywhere else
// that needs the same id, with no extra network call.
export function useTag(tagId: string | null | undefined) {
  return useQuery({
    queryKey: ['tag', tagId],
    queryFn: () => fetchTag(tagId as string),
    enabled: !!tagId,
    staleTime: 1000 * 60 * 30, // tags rarely change
  });
}

// ─── Resolve a set of tag IDs to a { id: name } map ───────────────────────
// Only fetches tags actually referenced by the caller — never scans or
// lists the whole Tag table. Scales the same way regardless of whether
// the table has 20 tags or 10,000, since cost only depends on how many
// distinct tags are actually visible on screen.
//
// Usage:
//   const allTagIds = stories.flatMap(s => [s.primaryTagId, s.secondaryTagId]);
//   const { data: tagMap, isLoading } = useTagNames(allTagIds);
//   tagMap[someId] // -> tag name, or undefined if not found/not loaded yet
export function useTagNames(tagIds: (string | null | undefined)[]) {
  const uniqueIds = useMemo(
    () => Array.from(new Set(tagIds.filter((id): id is string => !!id))),
    [tagIds.join(',')] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const results = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: ['tag', id],
      queryFn: () => fetchTag(id),
      staleTime: 1000 * 60 * 30,
    })),
  });

  const tagMap = useMemo(() => {
    const map: Record<string, string> = {};
    results.forEach((r) => {
      if (r.data) map[r.data.id] = r.data.name;
    });
    return map;
  }, [results]);

  const isLoading = results.some((r) => r.isLoading);

  return { data: tagMap, isLoading };
}