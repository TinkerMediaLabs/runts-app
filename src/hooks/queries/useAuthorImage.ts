import { useQuery } from '@tanstack/react-query';
import { getAuthorImageUrl } from '../../services/auth';

export function useAuthorImage(path: string | null | undefined) {
  return useQuery({
    queryKey: ['authorImage', path],
    queryFn: () => getAuthorImageUrl(path!),
    enabled: !!path && path.startsWith('authors/'),
    staleTime: 1000 * 60 * 60 * 24 * 6, // 6 days — matches URL expiry
    gcTime: 1000 * 60 * 60 * 24 * 7,    // keep in cache for 7 days
  });
}