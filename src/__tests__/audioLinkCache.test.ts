import { createAudioLinkCache, SAFETY_MARGIN_MS } from '../lib/audioLinkCache';

const DAY = 86400000;
const make = () => {
  let t = 1_000_000;
  const calls: string[][] = [];
  const cache = createAudioLinkCache({
    now: () => t,
    fetchLinks: async paths => {
      calls.push(paths);
      return { expiresAt: new Date(t + 7 * DAY).toISOString(), links: paths.map(p => ({ path: p, url: `https://cdn/${p}?t=${t}` })) };
    },
  });
  return { cache, calls, advance: (ms: number) => { t += ms; } };
};

describe('audio link cache', () => {
  it('asks the backend once and then serves from memory', async () => {
    const { cache, calls } = make();
    const a = await cache.getOne('stories/a.mp3');
    const b = await cache.getOne('stories/a.mp3');
    expect(a).toBe(b);
    expect(calls).toHaveLength(1);
  });

  it('refetches after the link is within a day of expiring', async () => {
    const { cache, calls, advance } = make();
    await cache.getOne('stories/a.mp3');
    advance(7 * DAY - SAFETY_MARGIN_MS - 1000);
    await cache.getOne('stories/a.mp3');
    expect(calls).toHaveLength(1);
    advance(2000);
    await cache.getOne('stories/a.mp3');
    expect(calls).toHaveLength(2);
  });

  it('splits big requests into batches of 50 and only asks for what is missing', async () => {
    const { cache, calls } = make();
    await cache.getOne('stories/p0.mp3');
    const paths = Array.from({ length: 120 }, (_, i) => `stories/p${i}.mp3`);
    const out = await cache.getMany(paths);
    expect(Object.keys(out)).toHaveLength(120);
    expect(calls.slice(1).map(c => c.length)).toEqual([50, 50, 19]);
  });

  it('forget makes the next request fetch a new link', async () => {
    const { cache, calls } = make();
    await cache.getOne('stories/a.mp3');
    cache.forget('stories/a.mp3');
    await cache.getOne('stories/a.mp3');
    expect(calls).toHaveLength(2);
  });

  it('leaves paths out when the backend did not sign them', async () => {
    const cache = createAudioLinkCache({ fetchLinks: async () => ({ expiresAt: new Date(Date.now() + 7 * DAY).toISOString(), links: [] }) });
    expect(await cache.getOne('stories/x.mp3')).toBeNull();
  });
});
