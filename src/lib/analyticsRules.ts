// Small pure helpers behind the funnel events (kept apart from analytics.ts so they can be tested without the SDK).

// Where a story was opened from, by the screen the tile was on. Sections inside Home override this with
// their own label (see StorySourceContext); a few places pass their own (for_you, continue, keep_going...).
const ROUTE_SOURCES: Record<string, string> = {
  HomeScreen: 'home',
  DiscoverScreen: 'discover',
  PlaylistScreen: 'library',
  PremiumScreen: 'premium',
  SearchScreen: 'search',
  TagHomeScreen: 'tag',
  AuthorDetails: 'author',
  AuthorFollowing: 'following',
  BrowseByTitle: 'browse_title',
  AllSubgenres: 'discover',
  InProgressScreen: 'in_progress',
  HistoryScreen: 'history',
  EroticHome: 'erotic_home',
  StoryScreen: 'more_like_this',
  UserScreen: 'profile',
};

export function sourceForRoute(name?: string | null): string {
  return (name && ROUTE_SOURCES[name]) || 'other';
}

// Remembers, for the story ids seen recently, where the listener came from, so play and completed events
// can carry the same label as the open. Bounded so it never grows; a story never seen reads as 'direct'.
export function createSourceMemory(limit = 200) {
  const sources = new Map<string, string>();
  return {
    note(storyId: string | undefined | null, source: string | undefined | null) {
      if (!storyId || !source) return;
      sources.delete(storyId);
      if (sources.size >= limit) sources.delete(sources.keys().next().value as string);
      sources.set(storyId, source);
    },
    get(storyId: string): string {
      return sources.get(storyId) ?? 'direct';
    },
  };
}

// True the first time a key is seen, false after. Used to send a Home section's "shown" once per app session
// instead of on every Home load.
export function createOnce() {
  const seen = new Set<string>();
  return (key: string): boolean => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
}
