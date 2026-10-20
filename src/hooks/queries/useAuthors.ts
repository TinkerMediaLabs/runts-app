import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

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
