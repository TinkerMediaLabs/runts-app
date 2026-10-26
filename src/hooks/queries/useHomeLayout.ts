import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { resolveHomeLayout, type HomeSectionRow } from '../../lib/homeLayout';

// The Home sections the CMS has set up. One small query on the ordered index; saved on the device so Home
// still lays out correctly offline. Errors or an empty table fall back to the default layout.
export function useHomeLayout() {
  const q = useQuery({
    queryKey: ['homeLayout'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const res: any = await (client.models.HomeSection as any).listHomeSectionByLayoutPkAndSortOrder(
        { layoutPk: 'HOME' }, { limit: 50 });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return (res.data ?? []) as HomeSectionRow[];
    },
    staleTime: 1000 * 60 * 5,
  });
  const sections = useMemo(() => resolveHomeLayout(q.data, Date.now()), [q.data]);
  return { sections, isLoading: q.isLoading };
}
