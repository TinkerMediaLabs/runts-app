// Who may play a story right now. Used by the player as a backstop for every way a story can start (pinned list,
// autoplay, downloads, bookmarks, resume), so a lapsed subscriber never plays Premium or erotic stories.
// Premium rule matches useIsLocked: the story's own flag wins, else its genre's flag.
export type StoryBlock = 'premium' | 'erotic' | null;

export function storyBlock(
  story: { isPremium?: boolean | null; isErotic?: string | null } | null | undefined,
  genreIsPremium: boolean,
  userIsPremium: boolean,
  eroticEnabled: boolean,
): StoryBlock {
  if (!story) return null;
  if (story.isErotic === 'true' && !eroticEnabled) return 'erotic';
  if (userIsPremium) return null;
  if (story.isPremium === true) return 'premium';
  if (story.isPremium === false) return null;
  return genreIsPremium ? 'premium' : null;
}
