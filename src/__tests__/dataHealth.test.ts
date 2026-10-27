import { findDrift, buildReport } from '../../amplify/functions/data-health/drift';

const live = (id: string, tag: string, extra: any = {}) => ({ id, live: 'true', primaryTagId: tag, liveTagId: tag, publishedAt: '2026-01-01T00:00:00Z', ...extra });

describe('findDrift', () => {
  it('finds nothing when everything is in step', () => {
    const stories = [live('s1', 't1'), { id: 's2', live: 'false', primaryTagId: 't1', publishedAt: '2026-01-02T00:00:00Z' }];
    const links = [
      { id: 'l1', storyId: 's1', tagId: 't1', liveTagId: 't1', publishedAt: '2026-01-01T00:00:00Z' },
      { id: 'l2', storyId: 's2', tagId: 't1', publishedAt: '2026-01-02T00:00:00Z' },
    ];
    expect(findDrift(stories, links)).toEqual({ storyFixes: [], linkFixes: [], orphans: [] });
  });

  it('flags a live story missing its liveTagId and a draft that still has one', () => {
    const d = findDrift([
      { id: 's1', live: 'true', primaryTagId: 't1', publishedAt: 'x' },
      { id: 's2', live: 'false', primaryTagId: 't1', liveTagId: 't1' },
    ], []);
    expect(d.storyFixes).toEqual([
      { table: 'Story', id: 's1', liveTagId: 't1' },
      { table: 'Story', id: 's2', liveTagId: undefined },
    ]);
  });

  it('flags links with wrong live flag or publishedAt, and orphans', () => {
    const d = findDrift([live('s1', 't1')], [
      { id: 'l1', storyId: 's1', tagId: 't2', publishedAt: '2026-01-01T00:00:00Z' },
      { id: 'l2', storyId: 's1', tagId: 't3', liveTagId: 't3', publishedAt: 'old' },
      { id: 'l3', storyId: 'gone', tagId: 't1' },
    ]);
    expect(d.linkFixes).toEqual([
      { table: 'StoryTag', id: 'l1', liveTagId: 't2', publishedAt: '2026-01-01T00:00:00Z' },
      { table: 'StoryTag', id: 'l2', liveTagId: 't3', publishedAt: '2026-01-01T00:00:00Z' },
    ]);
    expect(d.orphans).toEqual(['l3']);
  });
});

describe('buildReport', () => {
  const clean = { storyFixes: [], linkFixes: [], orphans: [] };
  const base = { stories: 10, links: 20, repaired: 0, repairCap: 500, snapshotAgeHours: 1, maxSnapshotAgeHours: 3 };

  it('is quiet when healthy', () => {
    expect(buildReport({ ...base, drift: clean }).problem).toBe(false);
  });
  it('reports drift even when repaired', () => {
    const r = buildReport({ ...base, repaired: 1, drift: { ...clean, storyFixes: [{ table: 'Story', id: 's', liveTagId: 't' }] } });
    expect(r.problem).toBe(true);
    expect(r.lines.join(' ')).toContain('repaired 1');
  });
  it('flags a stale or missing trending snapshot', () => {
    expect(buildReport({ ...base, snapshotAgeHours: 9, drift: clean }).problem).toBe(true);
    expect(buildReport({ ...base, snapshotAgeHours: null, drift: clean }).problem).toBe(true);
  });
});
