import { buildCarBrowseTree } from '../features/audio/carBrowseTree';

describe('car browse tree', () => {
  it('signed out shows only the sign-in note, nothing personal', () => {
    const tree = buildCarBrowseTree({ signedIn: false });
    expect(tree).toHaveLength(1);
    expect(tree[0].items).toHaveLength(1);
    expect(tree[0].items[0].title).toMatch(/sign in/i);
    expect(tree[0].items[0].url).toBeUndefined();
  });

  it('every id is unique and no category is empty', () => {
    for (const signedIn of [true, false]) {
      const tree = buildCarBrowseTree({ signedIn });
      const ids = tree.flatMap(c => [c.mediaId, ...c.items.map(i => i.mediaId)]);
      expect(new Set(ids).size).toBe(ids.length);
      tree.forEach(c => expect(c.items.length).toBeGreaterThan(0));
    }
  });
});
