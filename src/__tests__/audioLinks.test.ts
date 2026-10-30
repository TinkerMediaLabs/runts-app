import { validatePaths, buildLinks, MAX_PATHS, LINK_DAYS } from '../../amplify/functions/audio-links/links';

describe('audio links', () => {
  it('accepts story paths and removes duplicates', () => {
    expect(validatePaths(['stories/a/audio.mp3', 'stories/a/audio.mp3', 'stories/b/c d.m4a'.replace(' ', '_')]))
      .toEqual(['stories/a/audio.mp3', 'stories/b/c_d.m4a']);
  });

  it('rejects empty, oversized, and non-array input', () => {
    expect(() => validatePaths([])).toThrow();
    expect(() => validatePaths('stories/a.mp3')).toThrow();
    expect(() => validatePaths(Array.from({ length: MAX_PATHS + 1 }, (_, i) => `stories/${i}.mp3`))).toThrow();
  });

  it('rejects anything outside stories/, traversal, and odd characters', () => {
    for (const bad of ['profile-pictures/x/y.jpg', 'authors/a.jpg', '/stories/a.mp3', 'stories/../authors/a.jpg',
      'stories//a.mp3', 'stories/a b.mp3', 'stories/a.mp3?x=1', 5, null]) {
      expect(() => validatePaths([bad as any])).toThrow();
    }
  });

  it('builds one link per path that expires after the link lifetime', () => {
    const now = new Date('2026-10-29T12:00:00Z');
    const out = buildLinks({
      paths: ['stories/a/audio.mp3'], domain: 'd123.cloudfront.net', now,
      sign: (url, expires) => `${url}?exp=${expires.toISOString()}`,
    });
    expect(out.links).toEqual([{ path: 'stories/a/audio.mp3', url: 'https://d123.cloudfront.net/stories/a/audio.mp3?exp=2026-11-05T12:00:00.000Z' }]);
    expect(new Date(out.expiresAt).getTime() - now.getTime()).toBe(LINK_DAYS * 86400000);
  });
});
