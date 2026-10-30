import { sourceForRoute, createSourceMemory, createOnce } from '../lib/analyticsRules';

describe('sourceForRoute', () => {
  it('labels known screens and falls back to other', () => {
    expect(sourceForRoute('HomeScreen')).toBe('home');
    expect(sourceForRoute('SearchScreen')).toBe('search');
    expect(sourceForRoute('TagHomeScreen')).toBe('tag');
    expect(sourceForRoute('StoryScreen')).toBe('more_like_this');
    expect(sourceForRoute('SomethingNew')).toBe('other');
    expect(sourceForRoute(undefined)).toBe('other');
    expect(sourceForRoute(null)).toBe('other');
  });
});

describe('createSourceMemory', () => {
  it('returns direct for a story it has not seen', () => {
    expect(createSourceMemory().get('s1')).toBe('direct');
  });
  it('remembers the latest source for a story', () => {
    const m = createSourceMemory();
    m.note('s1', 'search');
    m.note('s1', 'for_you');
    expect(m.get('s1')).toBe('for_you');
  });
  it('ignores empty ids and sources', () => {
    const m = createSourceMemory();
    m.note('', 'search');
    m.note(undefined, 'search');
    m.note('s1', '');
    expect(m.get('s1')).toBe('direct');
  });
  it('stays within its limit, dropping the oldest', () => {
    const m = createSourceMemory(3);
    ['a', 'b', 'c', 'd'].forEach(id => m.note(id, 'x'));
    expect(m.get('a')).toBe('direct');
    expect(m.get('d')).toBe('x');
  });
  it('keeps a story that is noted again instead of dropping it', () => {
    const m = createSourceMemory(2);
    m.note('a', 'x'); m.note('b', 'x'); m.note('a', 'y'); m.note('c', 'x');
    expect(m.get('a')).toBe('y');
    expect(m.get('b')).toBe('direct');
  });
});

describe('createOnce', () => {
  it('is true the first time and false after', () => {
    const once = createOnce();
    expect(once('sec1')).toBe(true);
    expect(once('sec1')).toBe(false);
    expect(once('sec2')).toBe(true);
  });
});
