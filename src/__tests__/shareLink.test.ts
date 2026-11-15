import { parseStoryLink } from '../lib/shareLink';

describe('parseStoryLink', () => {
  it('reads the web link people share', () => {
    expect(parseStoryLink('https://tinkermedia.net/runts/story/abc-123')).toBe('abc-123');
    expect(parseStoryLink('https://www.tinkermedia.net/runts/story/abc_123/')).toBe('abc_123');
    expect(parseStoryLink('https://tinkermedia.net/runts/story/abc?utm=x#y')).toBe('abc');
  });
  it('reads the short runts.app link', () => {
    expect(parseStoryLink('https://runts.app/story/abc-123')).toBe('abc-123');
    expect(parseStoryLink('https://www.runts.app/story/abc_123/')).toBe('abc_123');
    expect(parseStoryLink('https://runts.app/story/abc?utm=x#y')).toBe('abc');
    expect(parseStoryLink('https://runts.app/story/a/b')).toBeNull();
    expect(parseStoryLink('https://runts.app/privacy')).toBeNull();
  });
  it('reads the app address from the preview page button', () => {
    expect(parseStoryLink('runts://story/abc-123')).toBe('abc-123');
    expect(parseStoryLink('runts-dev://story/abc')).toBe('abc');
    expect(parseStoryLink('runts-staging://story/abc/')).toBe('abc');
  });
  it('reads a development or staging preview link', () => {
    expect(parseStoryLink('https://z43dcgflzgnthz4mjfqyvxzene0ipikn.lambda-url.us-east-2.on.aws/story/abc-1?scheme=runts-dev')).toBe('abc-1');
    expect(parseStoryLink('https://evil.example/story/abc')).toBeNull();
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
