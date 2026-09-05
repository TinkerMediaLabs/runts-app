import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

export function useNarrators() {
  return useQuery({
    queryKey: ['narrators'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Narrator.list({ limit: 200 });
      if (errors) throw new Error(errors[0].message);
      return data ?? [];
    },
    staleTime: 1000 * 60 * 30,
  });
}
