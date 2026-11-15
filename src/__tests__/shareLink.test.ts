import { parseStoryLink } from '../lib/shareLink';

describe('parseStoryLink', () => {
  it('reads the web link people share', () => {
    expect(parseStoryLink('https://tinkermedia.net/runts/story/abc-123')).toBe('abc-123');
    expect(parseStoryLink('https://www.tinkermedia.net/runts/story/abc_123/')).toBe('abc_123');
    expect(parseStoryLink('https://tinkermedia.net/runts/story/abc?utm=x#y')).toBe('abc');
  });
  it('reads the app address from the preview page button', () => {
    expect(parseStoryLink('runts://story/abc-123')).toBe('abc-123');
    expect(parseStoryLink('runts-dev://story/abc')).toBe('abc');
    expect(parseStoryLink('runts-staging://story/abc/')).toBe('abc');
  });
  it('ignores everything else', () => {
    expect(parseStoryLink(null)).toBeNull();
    expect(parseStoryLink('')).toBeNull();
    expect(parseStoryLink('https://evil.example/runts/story/abc')).toBeNull();
    expect(parseStoryLink('https://tinkermedia.net/runts/privacy-policy')).toBeNull();
    expect(parseStoryLink('runts://')).toBeNull();
    expect(parseStoryLink('https://tinkermedia.net/runts/story/a/b')).toBeNull();
    expect(parseStoryLink('other://story/abc')).toBeNull();
  });
});
