import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

export function useUniverse(universeId: string | null | undefined) {
  return useQuery({
    queryKey: ['universe', universeId],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { data } = await client.models.Universe.get({ id: universeId as string });
      return data;
    },
    enabled: !!universeId,
    staleTime: 1000 * 60 * 30,
  });
}
