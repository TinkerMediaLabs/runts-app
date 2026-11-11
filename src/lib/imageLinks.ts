import { audioLinks } from './audioLinks';

// Story covers are served through the same signed CDN links as story audio (7 days each, cached by audioLinks).
// The old way (an S3 link signed with the login credentials) stopped working after about an hour no matter how
// long the app kept it, which left covers blank until the link was re-signed.
//
// Lists ask for many covers in the same moment, so requests made within a few milliseconds are sent to the
// backend as one batch (audioLinks splits anything over 50).

const WINDOW_MS = 25;

type Waiter = { resolve: (url: string) => void; reject: (e: Error) => void };
let pending = new Map<string, Waiter[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  const batch = pending;
  pending = new Map();
  timer = null;
  const paths = [...batch.keys()];
  try {
    const links = await audioLinks.getMany(paths);
    for (const [path, waiters] of batch) {
      const url = links[path];
      for (const w of waiters) url ? w.resolve(url) : w.reject(new Error(`No link for ${path}`));
    }
  } catch (e) {
    // One path the backend refuses (an odd file name) fails the whole request. Retry each on its own so the
    // others still get their links.
    if (paths.length > 1) {
      await Promise.all(paths.map(async path => {
        const waiters = batch.get(path)!;
        try {
          const url = (await audioLinks.getMany([path]))[path];
          for (const w of waiters) url ? w.resolve(url) : w.reject(new Error(`No link for ${path}`));
        } catch (err) {
          for (const w of waiters) w.reject(err as Error);
        }
      }));
    } else {
      for (const waiters of batch.values()) for (const w of waiters) w.reject(e as Error);
    }
  }
}

export function getCdnImageUrl(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const list = pending.get(path) ?? [];
    list.push({ resolve, reject });
    pending.set(path, list);
    if (!timer) timer = setTimeout(flush, WINDOW_MS);
  });
}
