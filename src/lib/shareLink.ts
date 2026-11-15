// Story links the app opens: the web link people share (https://tinkermedia.net/runts/story/<id>) and the app's own
// address the preview page's "Open in Runts" button uses (runts://story/<id>, also runts-dev:// and runts-staging://).
const WEB = /^https?:\/\/(?:www\.)?tinkermedia\.net\/runts\/story\/([A-Za-z0-9_-]{1,64})\/?(?:[?#].*)?$/i;
// Development and staging share links: <function address>/story/<id>?scheme=...
const PREVIEW = /^https:\/\/[a-z0-9]+\.lambda-url\.[a-z0-9-]+\.on\.aws\/story\/([A-Za-z0-9_-]{1,64})\/?(?:[?#].*)?$/i;
const APP = /^runts(?:-dev|-staging)?:\/\/story\/([A-Za-z0-9_-]{1,64})\/?(?:[?#].*)?$/i;

export function parseStoryLink(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = WEB.exec(url.trim()) ?? APP.exec(url.trim()) ?? PREVIEW.exec(url.trim());
  return m ? m[1] : null;
}
