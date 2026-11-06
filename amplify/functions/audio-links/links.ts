// Pure link-building logic (no AWS calls), so it can be unit tested. The handler supplies the real signer.

export const MAX_PATHS = 50;
export const LINK_DAYS = 7;
const PATH_PATTERN = /^stories\/[A-Za-z0-9._\/-]+$/;

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
