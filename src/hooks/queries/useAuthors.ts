import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

// ─── Fetch a single author by ID ──────────────────────────────────────────
export function useAuthor(id: string) {
  return useQuery({
    queryKey: ['author', id],
    queryFn: async () => {
      const { data, errors } = await client.models.Author.get({ id });
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Fetch all authors ────────────────────────────────────────────────────
export function useAuthors() {
  return useQuery({
    queryKey: ['authors'],
    queryFn: async () => {
      const { data, errors } = await client.models.Author.list();
      if (errors) throw new Error(errors[0].message);
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });
}