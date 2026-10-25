import { sceneIndexAt } from '../lib/sceneIndex';

const scenes = [{ startSeconds: 0 }, { startSeconds: 30 }, { startSeconds: 90 }];

describe('sceneIndexAt', () => {
  it('shows the first scene at the start', () => expect(sceneIndexAt(scenes, 0)).toBe(0));
  it('stays on a scene until the next one starts', () => expect(sceneIndexAt(scenes, 29.9)).toBe(0));
  it('switches exactly at a boundary', () => expect(sceneIndexAt(scenes, 30)).toBe(1));
  it('stays on the last scene past the end', () => expect(sceneIndexAt(scenes, 5000)).toBe(2));
  it('handles seeking backwards', () => expect(sceneIndexAt(scenes, 95) > sceneIndexAt(scenes, 10)).toBe(true));
  it('falls back to 0 when the first scene starts late', () => expect(sceneIndexAt([{ startSeconds: 10 }], 2)).toBe(0));
  it('does not throw with no scenes', () => expect(sceneIndexAt([], 5)).toBe(0));
});
