// Pure logic for the share preview page (no AWS calls), so it can be unit tested.
// Only live, non-erotic stories show their title, author and cover. Anything else (erotic, not live, missing, a bad
// id) gets the same generic Runts card, so the page never reveals that such a story exists.

export const DEFAULT_ICON = 'https://tinkermedia.net/runts/assets/icons/icon.png';
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const COVER_PATTERN = /^stories\/covers\/[A-Za-z0-9._\/-]+$/;

export type Route = { kind: 'story' | 'image'; id: string } | null;

// /story/<id> is the page, /image/<id> redirects to the cover.
export function parseRoute(rawPath: string | undefined): Route {
  const m = /^\/(story|image)\/([^/?#]+)\/?$/.exec(rawPath ?? '');
  if (!m || !ID_PATTERN.test(m[2])) return null;
  return { kind: m[1] as 'story' | 'image', id: m[2] };
}

export type PreviewStory = {
  id?: unknown; title?: unknown; summary?: unknown; authorId?: unknown; imageUri?: unknown;
  live?: unknown; isErotic?: unknown; duration?: unknown;
};
const isTrue = (v: unknown) => v === true || v === 'true';

export function isShowable(s: PreviewStory | null | undefined): boolean {
  return !!s && isTrue(s.live) && !isTrue(s.isErotic) && typeof s.title === 'string' && s.title.length > 0;
}

// A cover the preview may sign: the story's own cover file, under stories/covers/.
export function coverPath(s: PreviewStory | null | undefined): string | null {
  if (!isShowable(s)) return null;
  const p = s!.imageUri;
  return typeof p === 'string' && COVER_PATTERN.test(p) && !p.includes('..') && !p.includes('//') ? p : null;
}

export function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
}

export function clip(text: unknown, max: number): string {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…';
}

export function minutesLabel(seconds: unknown): string {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n < 60 ? 'under 1 min' : `${Math.round(n / 60)} min`;
}

export type PageInput = {
  story: PreviewStory | null;
  authorName?: string;
  pageUrl: string;       // this page's own address (og:url)
  imageUrl: string | null;   // cover redirect address, null = use the Runts icon
  appLink: string;       // runts://story/<id>
};

export function buildPage(i: PageInput): string {
  const show = isShowable(i.story);
  const title = show ? `${clip(i.story!.title, 90)}${i.authorName ? ` by ${clip(i.authorName, 60)}` : ''}` : 'Runts: short audio stories';
  const meta = show ? [minutesLabel(i.story!.duration), 'audio story'].filter(Boolean).join(' · ') : 'Short stories for your commute.';
  const desc = show ? (clip(i.story!.summary, 180) || `Listen on Runts. ${meta}`) : 'Short audio stories you can finish on your commute.';
  const image = show && i.imageUrl ? i.imageUrl : DEFAULT_ICON;
  const heading = show ? esc(i.story!.title) : 'Short stories for your commute';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)} | Runts</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:site_name" content="Runts" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:url" content="${esc(i.pageUrl)}" />
<meta name="twitter:card" content="${show && i.imageUrl ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(image)}" />
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px;text-align:center}
.logo{font-size:36px;font-weight:900;letter-spacing:-1px;color:#00ffff;margin-bottom:24px}
.card{background:#161616;border:1px solid #2a2a2a;border-radius:20px;padding:20px;max-width:400px;width:100%}
.cover{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:14px;margin-bottom:16px;background:#222}
h1{font-size:22px;font-weight:700;margin-bottom:6px}
.by{font-size:15px;color:rgba(255,255,255,.7);margin-bottom:4px}
.meta{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:16px}
.sum{font-size:14px;color:rgba(255,255,255,.6);line-height:1.5;margin-bottom:20px}
.btn{display:block;background:#00ffff;color:#000;text-decoration:none;font-weight:700;border-radius:14px;padding:14px;margin-bottom:10px}
.note{font-size:12px;color:rgba(255,255,255,.3)}
.footer{font-size:12px;color:rgba(255,255,255,.25);margin-top:28px}
.footer a{color:rgba(255,255,255,.35);text-decoration:none}
</style>
</head>
<body>
<div class="logo">runts</div>
<div class="card">
${show && i.imageUrl ? `<img class="cover" src="${esc(i.imageUrl)}" alt="Cover of ${esc(i.story!.title)}" />\n` : ''}<h1>${heading}</h1>
${show && i.authorName ? `<div class="by">by ${esc(i.authorName)}</div>\n` : ''}${show ? `<div class="meta">${esc(meta)}</div>\n` : ''}${show && clip(i.story!.summary, 220) ? `<div class="sum">${esc(clip(i.story!.summary, 220))}</div>\n` : ''}<a class="btn" href="${esc(i.appLink)}">Open in Runts</a>
<div class="note">Don't have the app yet? Runts is coming soon to iOS and Android.</div>
</div>
<div class="footer">A <a href="https://tinkermedia.net">TinkerMedia</a> app &nbsp;·&nbsp; <a href="https://tinkermedia.net/runts/privacy-policy">Privacy</a> &nbsp;·&nbsp; <a href="https://tinkermedia.net/runts/terms">Terms</a></div>
</body>
</html>`;
}

// The app address the "Open in Runts" button uses. Production links use runts; development and staging builds add
// ?scheme=runts-dev (or runts-staging) to their share links so the button opens that build. Anything else falls back.
const SCHEMES = ['runts', 'runts-dev', 'runts-staging'];
export function pickScheme(requested: unknown, fallback: string = 'runts'): string {
  return typeof requested === 'string' && SCHEMES.includes(requested) ? requested : fallback;
}
