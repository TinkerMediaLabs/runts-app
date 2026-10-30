import { buildCarBrowseTree, carMediaId, storyIdFromMediaId, MAX_CONTINUE, MAX_PLAYLIST, type CarStory } from '../features/audio/carBrowseTree';

const story = (n: number, extra: Partial<CarStory> = {}): CarStory => ({
  id: `s${n}`, title: `Story ${n}`, artist: 'A', audioUrl: `https://cdn/s${n}.mp3`, ...extra,
});

describe('car browse tree', () => {
  it('signed out shows only the sign-in note, nothing personal', () => {
    const tree = buildCarBrowseTree({ signedIn: false, continueListening: [story(1)], playlist: [story(2)] });
    expect(tree).toHaveLength(1);
    expect(tree[0].items).toHaveLength(1);
    expect(tree[0].items[0].title).toMatch(/sign in/i);
    expect(tree[0].items[0].url).toBeUndefined();
  });

  it('signed in with nothing yet shows a helpful note, not an empty screen', () => {
    const tree = buildCarBrowseTree({ signedIn: true });
    expect(tree).toHaveLength(1);
    expect(tree[0].items[0].url).toBeUndefined();
    expect(tree[0].items[0].title).toMatch(/pin/i);
  });

  it('builds Continue listening then My playlist, leaving out empty folders', () => {
    const both = buildCarBrowseTree({ signedIn: true, continueListening: [story(1)], playlist: [story(2)] });
    expect(both.map(c => c.title)).toEqual(['Continue listening', 'My playlist']);
    const only = buildCarBrowseTree({ signedIn: true, playlist: [story(2)] });
    expect(only.map(c => c.title)).toEqual(['My playlist']);
  });

  it('keeps ids unique when a story is in both folders, and can map back to the story', () => {
    const tree = buildCarBrowseTree({ signedIn: true, continueListening: [story(1)], playlist: [story(1)] });
    const ids = tree.flatMap(c => c.items.map(i => i.mediaId));
    expect(new Set(ids).size).toBe(2);
    expect(storyIdFromMediaId(carMediaId('playlist', 's1'))).toBe('s1');
    expect(storyIdFromMediaId('signed-out-note')).toBeNull();
  });

  it('caps list sizes and skips stories with no audio link or title', () => {
    const many = Array.from({ length: 100 }, (_, i) => story(i));
    const tree = buildCarBrowseTree({ signedIn: true, continueListening: many, playlist: many });
    expect(tree[0].items).toHaveLength(MAX_CONTINUE);
    expect(tree[1].items).toHaveLength(MAX_PLAYLIST);
    const bad = buildCarBrowseTree({ signedIn: true, playlist: [story(1, { audioUrl: '' }), story(2, { title: '' }), story(3)] });
    expect(bad[0].items.map(i => i.mediaId)).toEqual(['playlist:s3']);
  });

  it('every id is unique and no folder is empty', () => {
    const tree = buildCarBrowseTree({ signedIn: true, continueListening: [story(1), story(2)], playlist: [story(2), story(3)] });
    const ids = tree.flatMap(c => [c.mediaId, ...c.items.map(i => i.mediaId)]);
    expect(new Set(ids).size).toBe(ids.length);
    tree.forEach(c => expect(c.items.length).toBeGreaterThan(0));
  });
});
