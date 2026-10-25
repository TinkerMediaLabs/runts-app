import { useMemo } from 'react';
import { useAuthorNames } from './useAuthorNames';
import { useTagNames } from './useTagNames';
import { useStoryProgressMap } from './useStoryProgressMap';
import { isRecentlyPublished, formatNarratorDisplay } from '../../lib/storyDisplay';

// Adds what the Home tiles show (tag names, author, narrator, NEW badge, listening progress) to a list
// of stories. Looks names and progress up by id for just these stories, so it costs the same however
// large the catalog is. Erotic stories never appear on Home.
export function useEnrichedStories(stories: any[] | undefined) {
  const list = useMemo(() => (stories ?? []).filter(s => !!s?.id && s.isErotic !== 'true'), [stories]);
  const tagIds = useMemo(() => list.flatMap(s => [s.primaryTagId, s.secondaryTagId]), [list]);
  const { data: tagMap = {} } = useTagNames(tagIds);
  const { data: authorMap = {} } = useAuthorNames(list.map(s => s.authorId));
  const progressMap = useStoryProgressMap(list.map(s => s.id));

  const enriched = useMemo(() => list.map(story => {
    const progress = (progressMap as any)[story.id];
    return {
      ...story,
      primaryTagName:   story.primaryTagId   ? (tagMap as any)[story.primaryTagId]   ?? '' : '',
      secondaryTagName: story.secondaryTagId ? (tagMap as any)[story.secondaryTagId] ?? '' : '',
      authorName:       story.authorId       ? (authorMap as any)[story.authorId]    ?? '' : '',
      narratorDisplay:  formatNarratorDisplay((story.narratorNames ?? undefined) as string[] | undefined),
      isNew:            isRecentlyPublished(story.publishedAt),
      progressStatus:   progress?.status ?? 'none',
      progressSeconds:  progress?.progressSeconds ?? 0,
    };
  }), [list, tagMap, authorMap, progressMap]);

  return { stories: enriched, tagMap: tagMap as Record<string, string> };
}
