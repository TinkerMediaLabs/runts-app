import { useQuery } from '@tanstack/react-query';
import { getStoryImageUrl } from '../../services/auth';

export function useStoryImage(path: string | null | undefined) {
  return useQuery({
    queryKey: ['storyImage', path],
    queryFn: () => getStoryImageUrl(path!),
    enabled: !!path && path.startsWith('stories/'),
    staleTime: 1000 * 60 * 60 * 24 * 6, // 6 days — matches URL expiry
    gcTime: 1000 * 60 * 60 * 24 * 7,    // keep in cache for 7 days
  });
}