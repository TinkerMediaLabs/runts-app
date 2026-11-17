import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { FREE_PREMIUM_KEY, offerIsOpen } from '../../lib/freePremium';

// Is the free Premium offer open right now? One small read of a single settings row. A failed read just
// means "no offer shown"; the server checks the same date before granting anything.
export function useFreePremiumOffer() {
  const q = useQuery({
    queryKey: ['appSetting', FREE_PREMIUM_KEY],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const res: any = await (client.models as any).AppSetting.get({ id: FREE_PREMIUM_KEY });
      if (res.errors?.length) {
        console.warn('freePremiumOffer: could not read the setting:', res.errors[0].message);
        throw new Error(res.errors[0].message);
      }
      return (res.data?.value ?? null) as string | null;
    },
    staleTime: 1000 * 60 * 5,
  });
  return { open: offerIsOpen(q.data), isLoading: q.isLoading };
}
