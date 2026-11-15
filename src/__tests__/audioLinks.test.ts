import { validatePaths, buildLinks, MAX_PATHS, LINK_DAYS, validateStoryIds, guestAllowedPaths, assertGuestPaths, MAX_GUEST_STORIES } from '../../amplify/functions/audio-links/links';

describe('audio links', () => {
  it('accepts author photo paths', () => {
    expect(validatePaths(['authors/a1/photo.jpg'])).toEqual(['authors/a1/photo.jpg']);
  });

  it('accepts story paths and removes duplicates', () => {
    expect(validatePaths(['stories/a/audio.mp3', 'stories/a/audio.mp3', 'stories/b/c d.m4a'.replace(' ', '_')]))
      .toEqual(['stories/a/audio.mp3', 'stories/b/c_d.m4a']);
  });

  it('rejects empty, oversized, and non-array input', () => {
    expect(() => validatePaths([])).toThrow();
    expect(() => validatePaths('stories/a.mp3')).toThrow();
    expect(() => validatePaths(Array.from({ length: MAX_PATHS + 1 }, (_, i) => `stories/${i}.mp3`))).toThrow();
  });

  it('rejects anything outside stories/ and authors/, traversal, and odd characters', () => {
    for (const bad of ['profile-pictures/x/y.jpg', 'narrators/a.jpg', '/stories/a.mp3', 'authors/../profile-pictures/a.jpg',
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

describe('guest links', () => {
  const free = { live: 'true', isErotic: 'false', isPremium: false, imageUri: 'stories/covers/free.jpg', audioUri: 'stories/audio/free.mp3' };

  it('lets a guest have the cover and audio of a live, free, non-erotic story', () => {
    const allowed = guestAllowedPaths([free]);
    expect(() => assertGuestPaths(['stories/covers/free.jpg', 'stories/audio/free.mp3'], allowed)).not.toThrow();
  });

  it('gives a premium story its cover but not its audio', () => {
    const allowed = guestAllowedPaths([{ ...free, isPremium: true }]);
    expect(() => assertGuestPaths(['stories/covers/free.jpg'], allowed)).not.toThrow();
    expect(() => assertGuestPaths(['stories/audio/free.mp3'], allowed)).toThrow();
  });

  it('refuses everything for erotic or not-live stories', () => {
    for (const s of [{ ...free, isErotic: 'true' }, { ...free, isErotic: true }, { ...free, live: 'false' }, { ...free, live: undefined }]) {
      const allowed = guestAllowedPaths([s]);
      expect(() => assertGuestPaths(['stories/covers/free.jpg'], allowed)).toThrow();
      expect(() => assertGuestPaths(['stories/audio/free.mp3'], allowed)).toThrow();
    }
  });

  it('refuses a path that no named story owns, but always allows author photos', () => {
    const allowed = guestAllowedPaths([free]);
    expect(() => assertGuestPaths(['stories/audio/other.mp3'], allowed)).toThrow();
    expect(() => assertGuestPaths(['authors/a1/photo.jpg'], new Set())).not.toThrow();
  });

  it('checks story ids', () => {
    expect(validateStoryIds(undefined)).toEqual([]);
    expect(validateStoryIds(['a1', 'a1', 'b-2'])).toEqual(['a1', 'b-2']);
    expect(() => validateStoryIds(['bad id!'])).toThrow();
    expect(() => validateStoryIds(Array.from({ length: MAX_GUEST_STORIES + 1 }, (_, i) => `s${i}`))).toThrow();
  });
});
