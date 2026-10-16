import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { fetchAllPages } from '../../lib/paginate';

export function useAuthor(id: string) {
  return useQuery({
    queryKey: ['author', id],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Author.get({ id });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

// INTERIM (needs caller audit): fully paginated via byName index. Prefer useAuthor(id)
// or a search-by-prefix hook for screens; send me the callers of useAuthors() to convert.
export function useAuthors() {
  return useQuery({
    queryKey: ['authors'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      return fetchAllPages<any>(token =>
        client.models.Author.listAuthorBySearchPkAndNameLower({ searchPk: 'ALL' }, { limit: 200, nextToken: token }) as any);
    },
    staleTime: 1000 * 60 * 10,
  });
}
