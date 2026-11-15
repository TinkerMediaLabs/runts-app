import { validatePaths, buildLinks, MAX_PATHS, LINK_DAYS, validateStoryIds, guestAllowedPaths, assertGuestPaths, MAX_GUEST_STORIES, eroticPathSet, needsEroticList } from '../../amplify/functions/audio-links/links';

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

  it('refuses the audio of erotic or not-live stories, and covers of erotic ones', () => {
    for (const s of [{ ...free, isErotic: 'true' }, { ...free, isErotic: true }, { ...free, live: 'false' }, { ...free, live: undefined }]) {
      expect(() => assertGuestPaths(['stories/audio/free.mp3'], guestAllowedPaths([s]), eroticPathSet([s]))).toThrow();
    }
    const spicy = { ...free, isErotic: 'true' };
    expect(() => assertGuestPaths(['stories/covers/free.jpg'], guestAllowedPaths([spicy]), eroticPathSet([spicy]))).toThrow();
  });

  it('lets a guest have any cover or genre tile that is not erotic, without naming a story', () => {
    const erotic = eroticPathSet([{ imageUri: 'stories/covers/spicy.jpg', tileImageUri: 'stories/covers/tag-spicy.jpg', audioUri: 'stories/audio/spicy.mp3' }, { heroImageUri: 'stories/covers/tag-hero-spicy.jpg' }]);
    expect(() => assertGuestPaths(['stories/covers/anything.jpg', 'stories/covers/tag-fantasy.jpg'], new Set(), erotic)).not.toThrow();
    for (const p of ['stories/covers/spicy.jpg', 'stories/covers/tag-spicy.jpg', 'stories/covers/tag-hero-spicy.jpg']) {
      expect(() => assertGuestPaths([p], new Set(), erotic)).toThrow();
    }
  });

  it('never lets a guest have audio without naming a story, and only reads the erotic list for covers', () => {
    expect(() => assertGuestPaths(['stories/audio/free.mp3'], new Set(), new Set())).toThrow();
    expect(needsEroticList(['stories/audio/free.mp3', 'authors/a/p.jpg'])).toBe(false);
    expect(needsEroticList(['stories/covers/x.jpg'])).toBe(true);
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
