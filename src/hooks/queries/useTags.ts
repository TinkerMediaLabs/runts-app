import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { fetchAllPages } from '../../lib/paginate';

export function useTag(id: string | null | undefined) {
  return useQuery({
    queryKey: ['tag', id],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Tag.get({ id: id as string });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 30,
  });
}

// Primary tags via index (no filtered scan).
export function usePrimaryTags() {
  return useQuery({
    queryKey: ['tags', 'primary'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      return fetchAllPages<any>(token =>
        client.models.Tag.listTagByPrimaryFlagAndNameLower({ primaryFlag: 'true' }, { limit: 100, nextToken: token }) as any);
    },
    staleTime: 1000 * 60 * 30,
  });
}

// First page (100, alphabetical) of non-primary erotic tags for the Erotic home list.
// Bounded on purpose: a screen chip list never needs every tag; deeper browsing goes through search.
export function useAdditionalEroticTags() {
  return useQuery({
    queryKey: ['tags', 'erotic', 'additional'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Tag.listTagBySearchPkAndNameLower(
        { searchPk: 'EROTIC' },
        { limit: 100 }
      );
      if (errors) throw new Error(errors[0].message);
      return (data ?? []).filter((t: any) => !t.isPrimary);
    },
    staleTime: 1000 * 60 * 30,
  });
}

// Pool of non-primary, non-erotic tags for the Discover "popular tags" shuffle.
// Starts the byPrimaryAndName index at a random letter (picked once per mount) so the pool
// varies between visits without ever reading the whole table; wraps to the start if the
// tail of the alphabet is too short.
const POOL_SIZE = 60;
export function useMinorTagPool() {
  const startLetter = React.useMemo(
    () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)],
    []
  );
  return useQuery({
    queryKey: ['tags', 'minorPool', startLetter],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const fetchFrom = async (cond?: any) => {
        const { data, errors } = await client.models.Tag.listTagByPrimaryFlagAndNameLower(
          cond ? { primaryFlag: 'false', nameLower: cond } : { primaryFlag: 'false' },
          { limit: 100 }
        );
        if (errors) throw new Error(errors[0].message);
        return (data ?? []).filter((t: any) => !t.isErotic);
      };
      let pool = await fetchFrom({ ge: startLetter });
      if (pool.length < 12) {
        const head = await fetchFrom();
        const seen = new Set(pool.map((t: any) => t.id));
        pool = pool.concat(head.filter((t: any) => !seen.has(t.id)));
      }
      return pool.slice(0, POOL_SIZE);
    },
    staleTime: 1000 * 60 * 30,
  });
}
