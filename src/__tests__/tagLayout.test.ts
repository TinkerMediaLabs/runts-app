import { sizeTier, builtInTagLayout, buildTagRows, orderRelated, pickTagLayout, type Pools } from '../lib/tagLayout';
import type { HomeSectionRow } from '../lib/homeLayout';

const NOW = new Date('2026-10-26T12:00:00Z').getTime();
const st = (...ids: string[]) => ids.map(id => ({ id }));
const pools = (over: Partial<Pools> = {}): Pools =>
  ({ trending: [], popular: [], new: [], short: [], all: [], moreLike: [], shared: [], browse: [], ...over });
const sec = (type: string, over: Partial<HomeSectionRow> = {}): HomeSectionRow => ({ id: type, type, sortOrder: 10, ...over });
const ctx = { tagName: 'Crime', tagNames: { m: 'Mystery' } as Record<string, string> };

describe('sizeTier', () => {
  it('splits genres by live story count', () => {
    expect([0, 1, 6, 7, 30, 31].map(sizeTier)).toEqual(['empty', 'small', 'small', 'medium', 'medium', 'large']);
  });
});

describe('builtInTagLayout', () => {
  it('gives every size its own rows, in order', () => {
    const types = (t: any) => builtInTagLayout(t).map(r => r.type);
    expect(types('empty')).toEqual(['tagRelated']);
    expect(types('small')).toEqual(['tagAll', 'tagMoreLike', 'tagRelated']);
    expect(types('medium')[0]).toBe('tagNew');
    expect(types('large')[0]).toBe('tagFeatured');
    expect(types('large')).toContain('tagShared');
    const o = builtInTagLayout('large').map(r => r.sortOrder);
    expect(o).toEqual([...o].sort((a, b) => a - b));
  });
});

describe('buildTagRows', () => {
  it('never shows a story in two rows', () => {
    const p = pools({ trending: st('a', 'b', 'c', 'd'), popular: st('a', 'b', 'c', 'd', 'e', 'f', 'g'), new: st('a', 'h', 'i', 'j') });
    const rows = buildTagRows([sec('tagTrending', { sortOrder: 1 }), sec('tagPopular', { sortOrder: 2 }), sec('tagNew', { sortOrder: 3 })], p, ctx);
    const ids = rows.flatMap(r => r.stories.map(s => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(rows.map(r => r.type)).toEqual(['tagTrending', 'tagPopular', 'tagNew']);
    expect(rows[1].stories.map(s => s.id)).toEqual(['e', 'f', 'g']);
  });

  it('drops a row with too few stories left', () => {
    const p = pools({ trending: st('a', 'b', 'c'), popular: st('a', 'b', 'c', 'd') });
    const rows = buildTagRows([sec('tagTrending'), sec('tagPopular')], p, ctx);
    expect(rows.map(r => r.type)).toEqual(['tagTrending']);
  });

  it('honours the row size set in the layout', () => {
    const rows = buildTagRows([sec('tagNew', { limit: 4 })], pools({ new: st('a', 'b', 'c', 'd', 'e', 'f') }), ctx);
    expect(rows[0].stories.length).toBe(4);
  });

  it('shows a lone story in a small genre as a plain list', () => {
    const rows = buildTagRows([sec('tagAll')], pools({ all: st('only') }), ctx);
    expect(rows[0].stories.map(s => s.id)).toEqual(['only']);
  });

  it('builds a titled row for each related genre that shares enough stories', () => {
    const p = pools({ shared: [{ tagId: 'm', stories: st('a', 'b', 'c') }, { tagId: 'x', stories: st('a', 'b') }] });
    const rows = buildTagRows([sec('tagShared')], p, ctx);
    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe('Crime + Mystery');
    expect(rows[0].relatedTagId).toBe('m');
  });

  it('keeps related, author and hand-picked sections even though they hold no pool stories', () => {
    const rows = buildTagRows([sec('tagRelated'), sec('featuredAuthor'), sec('handPicked')], pools(), ctx);
    expect(rows.map(r => r.type)).toEqual(['tagRelated', 'featuredAuthor', 'handPicked']);
  });

  it('browse-all lists the paged stories of a large genre without removing repeats', () => {
    const rows = buildTagRows([sec('tagNew'), sec('tagBrowseAll', { sortOrder: 20 })], pools({ new: st('a', 'b', 'c'), browse: st('a', 'b', 'c', 'd') }), ctx);
    expect(rows[1].stories.map(s => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('browse-all of a medium genre lists only what the rows above did not', () => {
    const rows = buildTagRows([sec('tagNew', { limit: 3 }), sec('tagBrowseAll', { sortOrder: 20 })], pools({ new: st('a', 'b', 'c', 'd', 'e'), all: st('a', 'b', 'c', 'd', 'e') }), ctx);
    expect(rows[1].stories.map(s => s.id)).toEqual(['d', 'e']);
  });
});

describe('orderRelated', () => {
  it('puts pinned genres first, hides hidden ones, and removes repeats', () => {
    expect(orderRelated(['a', 'b', 'c'], ['c', 'z'], ['b'])).toEqual(['c', 'z', 'a']);
  });
  it('limits the list', () => {
    expect(orderRelated(['a', 'b', 'c'], [], [], 2)).toEqual(['a', 'b']);
  });
});

describe('pickTagLayout', () => {
  it("prefers the genre's own rows over the template and ignores unknown or inactive ones", () => {
    const own = [sec('tagNew', { sortOrder: 2 }), sec('tagWhat', { sortOrder: 1 }), sec('tagPopular', { sortOrder: 3, enabled: false })];
    const tmpl = [sec('tagTrending')];
    expect(pickTagLayout(own, tmpl, NOW)!.map(r => r.type)).toEqual(['tagNew']);
    expect(pickTagLayout([], tmpl, NOW)!.map(r => r.type)).toEqual(['tagTrending']);
    expect(pickTagLayout([], [], NOW)).toBeNull();
    expect(pickTagLayout(null, undefined, NOW)).toBeNull();
  });
});
