import { storyShareContent, storyLink } from '../lib/storyShareContent';

describe('storyShareContent', () => {
  it('shares only the link on iOS (so the chat app shows a card, not a sentence)', () => {
    const c = storyShareContent('abc', 'The Fall of House Usher', 'ios');
    expect(c).toEqual({ url: 'https://runts.app/story/abc', title: 'The Fall of House Usher' });
    expect((c as any).message).toBeUndefined();
  });
  it('sends the link as the message on Android', () => {
    expect(storyShareContent('abc', 'T', 'android')).toEqual({ message: 'https://runts.app/story/abc', title: 'T' });
  });
  it('falls back to a plain subject when there is no title', () => {
    expect(storyShareContent('abc', null, 'ios').title).toBe('Runts');
    expect(storyShareContent('abc', '', 'android').title).toBe('Runts');
  });
  it('builds the same link everywhere', () => { expect(storyLink('x1')).toBe('https://runts.app/story/x1'); });
});

describe('development and staging links', () => {
  const preview = { url: 'https://abc.lambda-url.us-east-2.on.aws/', scheme: 'runts-dev' };
  it('use the environment preview address with its app scheme', () => {
    expect(storyLink('x1', preview)).toBe('https://abc.lambda-url.us-east-2.on.aws/story/x1?scheme=runts-dev');
    expect(storyShareContent('x1', 'T', 'ios', preview).url).toBe('https://abc.lambda-url.us-east-2.on.aws/story/x1?scheme=runts-dev');
  });
  it('add a missing trailing slash', () => {
    expect(storyLink('x1', { url: 'https://abc.example', scheme: 'runts-staging' })).toBe('https://abc.example/story/x1?scheme=runts-staging');
  });
  it('fall back to the production link when there is no preview address', () => {
    expect(storyLink('x1', null)).toBe('https://runts.app/story/x1');
    expect(storyLink('x1', { url: '', scheme: 'runts-dev' })).toBe('https://runts.app/story/x1');
  });
});
