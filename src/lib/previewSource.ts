// Which file a story's Preview plays. Pure (no React Native imports) so it can be unit tested.
//
// A story with a preview clip (stories/previews/, about 30 seconds, made in the CMS or by scripts/makePreviewClips.ts)
// plays the clip from its start. Without a clip, a free story plays its full audio from the preview start; a premium
// story has no preview at all, because the server does not hand its full audio to a listener without Premium.
export type PreviewSource = { path: string; isClip: boolean };

export function previewSourceFor(
  story: { audioUri?: string | null; previewUri?: string | null; isPremium?: boolean | null },
): PreviewSource | null {
  if (story.previewUri) return { path: story.previewUri, isClip: true };
  if (story.audioUri && story.isPremium !== true) return { path: story.audioUri, isClip: false };
  return null;
}
