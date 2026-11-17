import {
  hasActivePremium, createPremiumChecker, premiumAudioSet, splitPremiumPaths, needsPremiumList,
} from '../../amplify/functions/audio-links/premium';

const NOW = Date.parse('2026-12-01T12:00:00Z');

describe('hasActivePremium', () => {
  it('is on with no end date or a future end date', () => {
    expect(hasActivePremium({ entitlements: { premium: { expires_date: null } } }, NOW)).toBe(true);
    expect(hasActivePremium({ entitlements: { premium: { expires_date: '2027-03-01T00:00:00Z' } } }, NOW)).toBe(true);
  });
  it('is off when ended, missing or unreadable', () => {
    expect(hasActivePremium({ entitlements: { premium: { expires_date: '2026-11-01T00:00:00Z' } } }, NOW)).toBe(false);
    expect(hasActivePremium({ entitlements: {} }, NOW)).toBe(false);
    expect(hasActivePremium({}, NOW)).toBe(false);
    expect(hasActivePremium(null, NOW)).toBe(false);
    expect(hasActivePremium({ entitlements: { premium: { expires_date: 'garbage' } } }, NOW)).toBe(false);
  });
  it('ignores other entitlements', () => {
    expect(hasActivePremium({ entitlements: { other: { expires_date: null } } }, NOW)).toBe(false);
  });
});

describe('premiumAudioSet and splitPremiumPaths', () => {
  const rows = [
    { id: 'stories/audio/a.mp3' },
    { id: 'stories/audio/b.mp3' },
    { id: 'stories/covers/not-audio.jpg' },   // only audio files count
    { id: undefined },
  ];
  const premium = premiumAudioSet(rows);
  it('keeps only audio paths', () => {
    expect([...premium].sort()).toEqual(['stories/audio/a.mp3', 'stories/audio/b.mp3']);
  });
  it('splits requested paths', () => {
    const { open, locked } = splitPremiumPaths(
      ['stories/audio/a.mp3', 'stories/audio/free.mp3', 'stories/covers/x.jpg', 'stories/previews/a.mp3'], premium);
    expect(locked).toEqual(['stories/audio/a.mp3']);
    expect(open).toEqual(['stories/audio/free.mp3', 'stories/covers/x.jpg', 'stories/previews/a.mp3']);
  });
});

describe('needsPremiumList', () => {
  it('only looks the list up when audio is requested', () => {
    expect(needsPremiumList(['stories/covers/x.jpg', 'authors/y.jpg', 'stories/previews/a.mp3'])).toBe(false);
    expect(needsPremiumList(['stories/covers/x.jpg', 'stories/audio/a.mp3'])).toBe(true);
  });
});

describe('createPremiumChecker', () => {
  it('asks RevenueCat once per person within the window, then again after it', async () => {
    let t = NOW;
    const fetchSubscriber = jest.fn(async () => ({ entitlements: { premium: { expires_date: null } } }));
    const check = createPremiumChecker({ fetchSubscriber, now: () => t, ttlMs: 60_000 });
    expect(await check('u1')).toBe(true);
    expect(await check('u1')).toBe(true);
    expect(fetchSubscriber).toHaveBeenCalledTimes(1);
    await check('u2');
    expect(fetchSubscriber).toHaveBeenCalledTimes(2);
    t += 61_000;
    await check('u1');
    expect(fetchSubscriber).toHaveBeenCalledTimes(3);
  });
  it('does not cache a failed lookup and lets the error through', async () => {
    const fetchSubscriber = jest.fn()
      .mockRejectedValueOnce(new Error('RevenueCat down'))
      .mockResolvedValueOnce({ entitlements: { premium: { expires_date: null } } });
    const check = createPremiumChecker({ fetchSubscriber });
    await expect(check('u1')).rejects.toThrow('RevenueCat down');
    expect(await check('u1')).toBe(true);
  });
  it('a free person is not premium', async () => {
    const check = createPremiumChecker({ fetchSubscriber: async () => ({ entitlements: {} }) });
    expect(await check('u1')).toBe(false);
  });
});
