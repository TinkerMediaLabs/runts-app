import { useQuery } from '@tanstack/react-query';
import { getAuthorImageUrl } from '../../services/auth';

export function useAuthorImage(path: string | null | undefined) {
  return useQuery({
    queryKey: ['authorImage', 'cdn', path], // ignores older saved entries (links that died within the hour)
    queryFn: () => getAuthorImageUrl(path!),
    enabled: !!path && path.startsWith('authors/'),
    staleTime: 1000 * 60 * 40, // CDN links last 7 days (cached by audioLinks); the fallback bucket link lasts ~1h
    gcTime: 1000 * 60 * 60 * 24 * 7,    // keep in cache for 7 days
  });
}