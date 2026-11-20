import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useApp } from '@/context/AppContext';
import { pickWorlds } from '../../lib/worlds';

// Setting tags (tagType 'setting': Space Station, Small Town, ...) for the Discover row. Read from the byTypeAndName
// index (one page, never a scan); the ones with the most stories come first. Same visibility rules as worlds: a
// name, at least one live story when the count is known, and erotic only when the listener has it turned on.
const POOL = 100;

export function useSettingTags(count: number, enabled: boolean = true) {
  const { eroticEnabled } = useApp();
  return useQuery({
    queryKey: ['settingTags', !!eroticEnabled, count],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const res: any = await (client.models.Tag as any).listTagByTagTypeAndNameLower({ tagType: 'setting' }, { limit: POOL });
      if (res.errors?.length) throw new Error(res.errors[0].message);
      return pickWorlds((res.data ?? []) as any[], !!eroticEnabled, count);
    },
    enabled,
    staleTime: 1000 * 60 * 15,
  });
}
