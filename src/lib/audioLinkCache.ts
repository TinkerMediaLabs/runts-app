// Remembers the signed CDN links for story audio so the app (and later the car list) asks the backend once per
// story per week, not once per play. The cache is a plain object with injected dependencies so it can be tested.

export const SAFETY_MARGIN_MS = 24 * 60 * 60 * 1000; // treat a link as expired a day early
const BATCH = 50;                                      // the backend allows at most 50 per request

export type FetchedLinks = { expiresAt: string; links: { path: string; url: string }[] };

export function createAudioLinkCache(deps: {
  fetchLinks: (paths: string[]) => Promise<FetchedLinks>;
  now?: () => number;
}) {
  const now = deps.now ?? (() => Date.now());
  const cache = new Map<string, { url: string; expiresAt: number }>();
  const inFlight = new Map<string, Promise<void>>();

  const fresh = (path: string) => {
    const hit = cache.get(path);
    return hit && hit.expiresAt - SAFETY_MARGIN_MS > now() ? hit.url : null;
  };

  async function load(paths: string[]) {
    const out = await deps.fetchLinks(paths);
    const expiresAt = new Date(out.expiresAt).getTime();
    for (const l of out.links) cache.set(l.path, { url: l.url, expiresAt });
  }

  /** Links for many stories at once. Paths that could not be signed are simply missing from the result. */
  async function getMany(paths: string[]): Promise<Record<string, string>> {
    const need = [...new Set(paths)].filter(p => !fresh(p));
    const batches: string[][] = [];
    for (let i = 0; i < need.length; i += BATCH) batches.push(need.slice(i, i + BATCH));
    await Promise.all(batches.map(b => {
      const key = b.join('|');
      let p = inFlight.get(key);
      if (!p) {
        p = load(b).finally(() => inFlight.delete(key));
        inFlight.set(key, p);
      }
      return p;
    }));
    const result: Record<string, string> = {};
    for (const p of paths) {
      const url = fresh(p);
      if (url) result[p] = url;
    }
    return result;
  }

  async function getOne(path: string): Promise<string | null> {
    return (await getMany([path]))[path] ?? null;
  }

  return { getMany, getOne, forget: (path: string) => { cache.delete(path); }, clear: () => cache.clear() };
}
