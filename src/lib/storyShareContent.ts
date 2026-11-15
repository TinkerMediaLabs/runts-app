// What the Share button sends. Only the link, no "Check out ..." sentence: Messages, Slack and most chat apps turn a
// lone link into a card with the cover, title and author (from the preview page behind the link), so the person who
// receives it sees the card instead of a long address. Android's share sheet takes the link as the message text.
// Pure (no react-native import) so it can be unit tested.
export const PROD_SHARE_BASE = 'https://tinkermedia.net/runts/story/';
// `preview` is the environment's own preview page address and `scheme` its app scheme; set only for development and
// staging builds, whose stories do not exist in production, so their links show real cards and open the right build.
export type SharePreview = { url: string; scheme: string } | null;
export function storyLink(id: string, preview: SharePreview = null): string {
  if (!preview?.url) return `${PROD_SHARE_BASE}${id}`;
  const base = preview.url.endsWith('/') ? preview.url : `${preview.url}/`;
  return `${base}story/${id}${preview.scheme ? `?scheme=${encodeURIComponent(preview.scheme)}` : ''}`;
}

export function storyShareContent(id: string, title: string | null | undefined, os: string, preview: SharePreview = null) {
  const url = storyLink(id, preview);
  const subject = title || 'Runts';   // email subject; chat apps ignore it
  return os === 'android' ? { message: url, title: subject } : { url, title: subject };
}
