import { useQuery } from '@tanstack/react-query';
import { getStoryImageUrl } from '../../services/auth';
import { getLocalCoverPath } from '../../lib/offlineStorage';

// A cover saved with a download is used first: it works offline, and signing a URL succeeds offline
// (no request is made) so the remote link would just be a broken image.
export function useStoryImage(path: string | null | undefined) {
  return useQuery({
    queryKey: ['storyImage', path],
    queryFn: async () => (await getLocalCoverPath(path!)) ?? getStoryImageUrl(path!),
    enabled: !!path && path.startsWith('stories/'),
    staleTime: 1000 * 60 * 60 * 24 * 6, // 6 days — matches URL expiry
    gcTime: 1000 * 60 * 60 * 24 * 7,    // keep in cache for 7 days
  });
}
