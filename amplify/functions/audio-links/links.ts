// Pure link-building logic (no AWS calls), so it can be unit tested. The handler supplies the real signer.

export const MAX_PATHS = 50;
export const LINK_DAYS = 7;
// Story files and author photos only. profile-pictures/ stays private (owner-only in the bucket rules).
const PATH_PATTERN = /^(stories|authors)\/[A-Za-z0-9._\/-]+$/;

export type AudioLink = { path: string; url: string };

export function validatePaths(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error('No files requested');
  if (input.length > MAX_PATHS) throw new Error(`Ask for at most ${MAX_PATHS} files at a time`);
  const seen = new Set<string>();
  for (const p of input) {
    if (typeof p !== 'string' || p.length > 300 || !PATH_PATTERN.test(p) || p.includes('..') || p.includes('//')) {
      throw new Error('Invalid file path');
    }
    seen.add(p);
  }
  return [...seen];
}

export function buildLinks(opts: {
  paths: string[];
  domain: string;
  now: Date;
  sign: (url: string, expires: Date) => string;
}): { expiresAt: string; links: AudioLink[] } {
  const expires = new Date(opts.now.getTime() + LINK_DAYS * 24 * 60 * 60 * 1000);
  const links = opts.paths.map(path => ({
    path,
    url: opts.sign(`https://${opts.domain}/${path.split('/').map(encodeURIComponent).join('/')}`, expires),
  }));
  return { expiresAt: expires.toISOString(), links };
}

// ── Guests (not signed in) ─────────────────────────────────────────────────
// A guest names the stories they are looking at; the function reads those stories and signs only what a guest may
// have: covers of live, non-erotic stories, and audio of live, non-erotic, non-premium stories (their 30-second
// preview). Author photos are open. Anything else is refused.
export const MAX_GUEST_STORIES = 25;

export type GuestStory = { live?: unknown; isErotic?: unknown; isPremium?: unknown; imageUri?: unknown; tileImageUri?: unknown; audioUri?: unknown };

const isTrue = (v: unknown) => v === true || v === 'true';

export function validateStoryIds(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0) return [];
  if (input.length > MAX_GUEST_STORIES) throw new Error(`Ask about at most ${MAX_GUEST_STORIES} stories at a time`);
  const ids = new Set<string>();
  for (const id of input) {
    if (typeof id !== 'string' || id.length > 64 || !/^[A-Za-z0-9-]+$/.test(id)) throw new Error('Invalid story id');
    ids.add(id);
  }
  return [...ids];
}

export function guestAllowedPaths(stories: GuestStory[]): Set<string> {
  const allowed = new Set<string>();
  for (const s of stories) {
    if (!isTrue(s.live) || isTrue(s.isErotic)) continue;
    for (const img of [s.imageUri, s.tileImageUri]) if (typeof img === 'string' && img.startsWith('stories/')) allowed.add(img);
    if (!isTrue(s.isPremium) && typeof s.audioUri === 'string' && s.audioUri.startsWith('stories/')) allowed.add(s.audioUri);
  }
  return allowed;
}

export function assertGuestPaths(paths: string[], allowed: Set<string>) {
  for (const p of paths) {
    if (p.startsWith('authors/') || allowed.has(p)) continue;
    throw new Error('Sign in to see this');
  }
}
