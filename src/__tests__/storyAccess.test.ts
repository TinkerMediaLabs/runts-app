import { storyBlock } from '../lib/storyAccess';

describe('storyBlock', () => {
  it('lets Premium users play premium stories', () => {
    expect(storyBlock({ isPremium: true }, false, true, true)).toBeNull();
  });
  it('blocks a premium story for a free user', () => {
    expect(storyBlock({ isPremium: true }, false, false, false)).toBe('premium');
  });
  it('story flag false beats a premium genre', () => {
    expect(storyBlock({ isPremium: false }, true, false, false)).toBeNull();
  });
  it('falls back to the genre flag', () => {
    expect(storyBlock({ isPremium: null }, true, false, false)).toBe('premium');
    expect(storyBlock({ isPremium: null }, false, false, false)).toBeNull();
  });
  it('blocks erotic when erotic is off', () => {
    expect(storyBlock({ isErotic: 'true' }, false, true, false)).toBe('erotic');
    expect(storyBlock({ isErotic: 'true' }, false, true, true)).toBeNull();
  });
  it('allows missing story', () => {
    expect(storyBlock(null, false, false, false)).toBeNull();
  });
});
