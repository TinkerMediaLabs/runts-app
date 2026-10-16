import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// One narrator by id. (The old useNarrators() loaded the whole table and is gone — nothing used it
// after narrator names moved onto Story.narratorNames.)
export function useNarrator(id: string | null | undefined) {
  return useQuery({
    queryKey: ['narrator', id],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Narrator.get({ id: id as string });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 30,
  });
}
