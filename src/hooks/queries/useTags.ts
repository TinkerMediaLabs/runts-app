import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { fetchAllPages } from '../../lib/paginate';

// INTERIM (needs caller audit): returns ALL tags, correctly paginated via the byName index
// so nothing is silently dropped. Callers that only need a few tags must switch to
// useTag(id) / batched get — send me the callers and I'll convert them.
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      // Tags are partitioned REGULAR / EROTIC (searchPk) — pull both partitions.
      const part = (searchPk: string) => fetchAllPages<any>(token =>
        client.models.Tag.listTagBySearchPkAndNameLower({ searchPk }, { limit: 200, nextToken: token }) as any);
      const [regular, erotic] = await Promise.all([part('REGULAR'), part('EROTIC')]);
      return [...regular, ...erotic];
    },
    staleTime: 1000 * 60 * 30,
  });
}

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
