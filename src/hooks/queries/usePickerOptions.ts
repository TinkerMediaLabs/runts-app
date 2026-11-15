import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { fetchAllPages } from '../../lib/paginate';

// The moods and lengths shown in the taste picker. Both lists are managed in the CMS, so nothing is hard-coded here.
// Each is one small indexed query (tens of rows at most) and cached for the session.

// Mood tags in the order set in the CMS, minus any switched off or erotic. Guests can read these too.
export function usePickerMoods() {
  return useQuery({
    queryKey: ['picker', 'moods'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const rows = await fetchAllPages<any>(token =>
        client.models.Tag.listTagByTagTypeAndSortOrder({ tagType: 'mood' }, { limit: 100, nextToken: token }) as any);
      return rows.filter((t: any) => t.pickerEnabled !== false && !t.isErotic);
    },
    staleTime: 1000 * 60 * 30,
  });
}

// Length options (label, minutes range as 15-minute bands) in CMS order, minus any switched off.
export function usePickerLengths() {
  return useQuery({
    queryKey: ['picker', 'lengths'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const rows = await fetchAllPages<any>(token =>
        client.models.PickerOption.listPickerOptionByKindAndSortOrder({ kind: 'length' }, { limit: 100, nextToken: token }) as any);
      return rows.filter((o: any) => o.enabled !== false);
    },
    staleTime: 1000 * 60 * 30,
  });
}
