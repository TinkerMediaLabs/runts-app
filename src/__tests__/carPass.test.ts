import { signPass, verifyPass, PASS_DAYS } from '../../amplify/functions/car-progress/pass';
import { handleProgress, FINISH_WITHIN_SECONDS, type ProgressDeps } from '../../amplify/functions/car-progress/core';

const SECRET = 'test-secret';
const NOW = Date.UTC(2026, 9, 29);

describe('car pass', () => {
  const { pass } = signPass({ userId: 'u1', owner: 'u1::bob' }, SECRET, NOW);

  it('verifies a good pass and returns who it belongs to', () => {
    expect(verifyPass(pass, SECRET, NOW + 1000)).toEqual({ userId: 'u1', owner: 'u1::bob' });
  });
  it('expires after the pass lifetime', () => {
    expect(verifyPass(pass, SECRET, NOW + (PASS_DAYS * 86400 - 5) * 1000)).not.toBeNull();
    expect(verifyPass(pass, SECRET, NOW + (PASS_DAYS * 86400 + 5) * 1000)).toBeNull();
  });
  it('rejects a wrong secret, a tampered body, and junk', () => {
    expect(verifyPass(pass, 'other', NOW)).toBeNull();
    const [payload, sig] = pass.split('.');
    const forged = Buffer.from(JSON.stringify({ u: 'victim', o: 'x', exp: 9999999999 })).toString('base64url');
    expect(verifyPass(`${forged}.${sig}`, SECRET, NOW)).toBeNull();
    for (const bad of ['', 'abc', 'a.b.c', undefined]) expect(verifyPass(bad as any, SECRET, NOW)).toBeNull();
    expect(payload.length).toBeGreaterThan(0);
  });
});

describe('car progress receiver', () => {
  const calls: any[] = [];
  const deps = (): ProgressDeps => ({
    secret: SECRET, now: () => NOW,
    saveProgress: async a => { calls.push(['save', a]); },
    finish: async a => { calls.push(['finish', a]); },
  });
  const auth = `Bearer ${signPass({ userId: 'u1', owner: 'u1::bob' }, SECRET, NOW).pass}`;
  // `null` means "send no Authorization header" (undefined would fall back to the default valid pass).
  const post = (body: any, authorization: string | null = auth) =>
    handleProgress({ authorization: authorization ?? undefined, body: typeof body === 'string' ? body : JSON.stringify(body) }, deps());
  beforeEach(() => { calls.length = 0; });

  it('refuses requests without a valid pass', async () => {
    expect((await post({ mediaId: 'continue:s1', position: 10, duration: 100 }, null)).status).toBe(401);
    expect((await post({ mediaId: 'continue:s1', position: 10, duration: 100 }, 'Bearer nope')).status).toBe(401);
    expect(calls).toHaveLength(0);
  });
  it('saves the position of a car-list story', async () => {
    expect((await post({ mediaId: 'playlist:s1', position: 61.9, duration: 1000 })).status).toBe(204);
    expect(calls).toEqual([['save', { userId: 'u1', owner: 'u1::bob', storyId: 's1', position: 61 }]]);
  });
  it('saves the position of a story started from the Trending folder', async () => {
    expect((await post({ mediaId: 'trending:s1', position: 30, duration: 1000 })).status).toBe(204);
    expect(calls).toEqual([['save', { userId: 'u1', owner: 'u1::bob', storyId: 's1', position: 30 }]]);
  });
  it('marks the story finished near the end', async () => {
    await post({ mediaId: 'continue:s2', position: 1000 - FINISH_WITHIN_SECONDS, duration: 1000 });
    expect(calls).toEqual([['finish', { userId: 'u1', owner: 'u1::bob', storyId: 's2' }]]);
  });
  it('ignores phone-started items, zero positions, and unknown durations never finish a story', async () => {
    await post({ mediaId: 'https://cdn/x.mp3', position: 50, duration: 100 });
    await post({ mediaId: 'continue:s1', position: 0, duration: 100 });
    expect(calls).toHaveLength(0);
    await post({ mediaId: 'continue:s1', position: 50, duration: -9223372036854775 });
    expect(calls[0][0]).toBe('save');
  });
  it('rejects unreadable bodies', async () => {
    expect((await post('not json')).status).toBe(400);
  });
});
