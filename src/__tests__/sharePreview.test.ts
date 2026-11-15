import { pickScheme, parseRoute, isShowable, coverPath, buildPage, esc, clip, minutesLabel, DEFAULT_ICON } from '../../amplify/functions/share-preview/preview';

const story = { id: 's1', title: 'The "Lantern" & Co', summary: 'A short <b>tale</b> of light.', authorId: 'a1', imageUri: 'stories/covers/s1.jpg', live: 'true', isErotic: 'false', duration: 1260 };

describe('parseRoute', () => {
  it('reads story and image paths', () => {
    expect(parseRoute('/story/abc-123')).toEqual({ kind: 'story', id: 'abc-123' });
    expect(parseRoute('/image/abc_123/')).toEqual({ kind: 'image', id: 'abc_123' });
  });
  it('rejects anything else', () => {
    expect(parseRoute('/')).toBeNull();
    expect(parseRoute(undefined)).toBeNull();
    expect(parseRoute('/story/')).toBeNull();
    expect(parseRoute('/story/a/b')).toBeNull();
    expect(parseRoute('/story/..%2Fx')).toBeNull();
    expect(parseRoute('/other/abc')).toBeNull();
    expect(parseRoute('/story/' + 'a'.repeat(65))).toBeNull();
  });
});

describe('isShowable and coverPath', () => {
  it('shows live, non-erotic stories with a title', () => {
    expect(isShowable(story)).toBe(true);
    expect(coverPath(story)).toBe('stories/covers/s1.jpg');
  });
  it('hides erotic, not-live and missing stories', () => {
    expect(isShowable({ ...story, isErotic: 'true' })).toBe(false);
    expect(isShowable({ ...story, live: 'false' })).toBe(false);
    expect(isShowable({ ...story, title: '' })).toBe(false);
    expect(isShowable(null)).toBe(false);
    expect(coverPath({ ...story, isErotic: 'true' })).toBeNull();
    expect(coverPath(null)).toBeNull();
  });
  it('only signs real cover paths', () => {
    expect(coverPath({ ...story, imageUri: 'stories/audio/x.mp3' })).toBeNull();
    expect(coverPath({ ...story, imageUri: 'stories/covers/../audio/x.mp3' })).toBeNull();
    expect(coverPath({ ...story, imageUri: 'https://evil.example/x.jpg' })).toBeNull();
    expect(coverPath({ ...story, imageUri: undefined })).toBeNull();
  });
});

describe('text helpers', () => {
  it('escapes html', () => { expect(esc(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;'); });
  it('clips long text with an ellipsis', () => {
    expect(clip('short', 10)).toBe('short');
    expect(clip('a'.repeat(50), 10)).toBe('aaaaaaaaa…');
    expect(clip('  many   spaces\nhere ', 50)).toBe('many spaces here');
  });
  it('words durations', () => {
    expect(minutesLabel(1260)).toBe('21 min');
    expect(minutesLabel(30)).toBe('under 1 min');
    expect(minutesLabel(0)).toBe('');
    expect(minutesLabel(undefined)).toBe('');
  });
});

describe('buildPage', () => {
  const base = { pageUrl: 'https://tinkermedia.net/runts/story/s1', imageUrl: 'https://x.example/image/s1', appLink: 'runts://story/s1' };
  it('puts the story in the link-preview tags, escaped', () => {
    const html = buildPage({ ...base, story, authorName: 'Jordan Reyes' });
    expect(html).toContain('<meta property="og:title" content="The &quot;Lantern&quot; &amp; Co by Jordan Reyes" />');
    expect(html).toContain('content="A short &lt;b&gt;tale&lt;/b&gt; of light."');
    expect(html).toContain('<meta property="og:image" content="https://x.example/image/s1" />');
    expect(html).toContain('summary_large_image');
    expect(html).toContain('href="runts://story/s1"');
    expect(html).not.toContain('<b>tale</b>');
  });
  it('shows only the generic card for an erotic or missing story', () => {
    for (const s of [{ ...story, isErotic: 'true' }, null]) {
      const html = buildPage({ ...base, story: s as any, authorName: 'Jordan Reyes' });
      expect(html).not.toContain('Lantern');
      expect(html).not.toContain('Jordan Reyes');
      expect(html).toContain(`content="${DEFAULT_ICON}"`);
      expect(html).toContain('og:title" content="Runts: short audio stories"');
    }
  });
});

describe('pickScheme', () => {
  it('accepts only the app schemes', () => {
    expect(pickScheme('runts-dev')).toBe('runts-dev');
    expect(pickScheme('runts-staging')).toBe('runts-staging');
    expect(pickScheme('runts')).toBe('runts');
  });
  it('falls back for anything else', () => {
    expect(pickScheme('javascript')).toBe('runts');
    expect(pickScheme('https')).toBe('runts');
    expect(pickScheme(undefined)).toBe('runts');
    expect(pickScheme('x', 'runts-dev')).toBe('runts-dev');
  });
});
