import { computeInsights, discoverFields, staleInsightIds } from '../../amplify/functions/tag-insights/insights';

// stories: storyId -> [tagIds], with a publish date so "newest first" is testable
const links = (spec: Record<string, { tags: string[]; pub: string }>) =>
  Object.entries(spec).flatMap(([storyId, v]) => v.tags.map(tagId => ({ storyId, tagId, publishedAt: v.pub })));

describe('computeInsights', () => {
  it('counts live stories per tag', () => {
    const r = computeInsights(links({ s1: { tags: ['a', 'b'], pub: '2026-01-01' }, s2: { tags: ['a'], pub: '2026-01-02' } }), new Set());
    expect(r.get('a')!.liveCount).toBe(2);
    expect(r.get('b')!.liveCount).toBe(1);
  });

  it('ranks the genre that overlaps most (by similarity), not just the biggest genre', () => {
    // crime and mystery share 4 of their 5 stories each; "romance" is huge and shares only 2 with crime
    const spec: Record<string, { tags: string[]; pub: string }> = {};
    for (let i = 0; i < 4; i++) spec[`cm${i}`] = { tags: ['crime', 'mystery'], pub: `2026-02-0${i + 1}` };
    spec.c4 = { tags: ['crime'], pub: '2026-02-10' };
    spec.m4 = { tags: ['mystery'], pub: '2026-02-11' };
    for (let i = 0; i < 2; i++) spec[`cr${i}`] = { tags: ['crime', 'romance'], pub: `2026-03-0${i + 1}` };
    for (let i = 0; i < 60; i++) spec[`r${i}`] = { tags: ['romance'], pub: '2026-03-10' };
    const r = computeInsights(links(spec), new Set());
    expect(r.get('crime')!.related.map(x => x.tagId)).toEqual(['mystery', 'romance']);
    expect(r.get('crime')!.related[0].count).toBe(4);
  });

  it('keeps erotic and regular genres apart', () => {
    const r = computeInsights(links({ s1: { tags: ['a', 'hot'], pub: '2026-01-01' }, s2: { tags: ['hot', 'hotter'], pub: '2026-01-02' } }), new Set(['hot', 'hotter']));
    expect(r.get('a')!.related).toEqual([]);
    expect(r.get('hot')!.related.map(x => x.tagId)).toEqual(['hotter']);
  });

  it('lists the newest shared stories, newest first, for the top related genres only', () => {
    const r = computeInsights(links({
      old: { tags: ['a', 'b'], pub: '2026-01-01' },
      mid: { tags: ['a', 'b'], pub: '2026-02-01' },
      new: { tags: ['a', 'b'], pub: '2026-03-01' },
      solo: { tags: ['a'], pub: '2026-04-01' },
    }), new Set());
    expect(r.get('a')!.shared.b).toEqual(['new', 'mid', 'old']);
    expect(r.get('b')!.shared.a).toEqual(['new', 'mid', 'old']);
  });

  it('limits related genres and shared lists', () => {
    const spec: Record<string, { tags: string[]; pub: string }> = {};
    for (let i = 0; i < 12; i++) spec[`s${i}`] = { tags: ['a', `t${i}`, 'b'], pub: `2026-01-${String(i + 1).padStart(2, '0')}` };
    const r = computeInsights(links(spec), new Set(), { relatedMax: 3, sharedFor: 1, sharedMax: 2 });
    expect(r.get('a')!.related.length).toBe(3);
    expect(Object.keys(r.get('a')!.shared).length).toBe(1);
    expect(Object.values(r.get('a')!.shared)[0].length).toBe(2);
  });

  it('is empty for no links and ignores a story listed twice for the same tag', () => {
    expect(computeInsights([], new Set()).size).toBe(0);
    const r = computeInsights([{ storyId: 's', tagId: 'a' }, { storyId: 's', tagId: 'a' }], new Set());
    expect(r.get('a')!.liveCount).toBe(1);
  });
});

describe('discoverFields', () => {
  it('lists a subgenre that has live stories', () => {
    expect(discoverFields({ id: 'a', name: ' Haunted House ' }, 3)).toEqual({ name: 'Haunted House', nameLower: 'haunted house', listed: true });
  });
  it('does not list empty, primary or erotic genres', () => {
    expect(discoverFields({ id: 'a', name: 'X' }, 0).listed).toBe(false);
    expect(discoverFields({ id: 'a', name: 'X', isPrimary: true }, 9).listed).toBe(false);
    expect(discoverFields({ id: 'a', name: 'X', isErotic: true }, 9).listed).toBe(false);
  });
  it('does not list a genre without a name', () => {
    expect(discoverFields({ id: 'a' }, 5).listed).toBe(false);
  });
});

describe('staleInsightIds', () => {
  it('returns rows whose genre is gone', () => {
    expect(staleInsightIds(['a', 'b', 'c'], new Set(['a', 'c']))).toEqual(['b']);
  });
});
