import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

// ─── Fetch all tags ───────────────────────────────────────────────────────
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, errors } = await client.models.Tag.list();
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    staleTime: 1000 * 60 * 30, // tags rarely change — cache for 30 minutes
  });
}

// ─── Fetch primary tags only ──────────────────────────────────────────────
export function usePrimaryTags() {
  return useQuery({
    queryKey: ['tags', 'primary'],
    queryFn: async () => {
      const { data, errors } = await client.models.Tag.list({
        filter: { isPrimary: { eq: true } },
      });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });
}