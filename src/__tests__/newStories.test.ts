import { hasNewStories } from '../lib/newStories';

describe('hasNewStories', () => {
  const followed = '2026-11-01T00:00:00.000Z';
  it('is false when the tag has no dated story', () => expect(hasNewStories(null, null, followed)).toBe(false));
  it('is false for stories older than the follow', () => expect(hasNewStories('2026-10-20T00:00:00.000Z', null, followed)).toBe(false));
  it('is true for a story published after the follow, never opened', () => expect(hasNewStories('2026-11-05T00:00:00.000Z', null, followed)).toBe(true));
  it('is false once the tag was opened after the newest story', () =>
    expect(hasNewStories('2026-11-05T00:00:00.000Z', '2026-11-06T00:00:00.000Z', followed)).toBe(false));
  it('is true again when a newer story arrives after the last visit', () =>
    expect(hasNewStories('2026-11-10T00:00:00.000Z', '2026-11-06T00:00:00.000Z', followed)).toBe(true));
  it('is false when there is no visit or follow date to compare with', () => expect(hasNewStories('2026-11-05T00:00:00.000Z', null, null)).toBe(false));
});
