import { pickWorlds, visibleWorlds, storiesLabel } from '../lib/worlds';

const w = (id: string, name: string, storyCount: number | null, isErotic = false) => ({ id, name, storyCount, isErotic });

describe('worlds', () => {
  const rows = [w('a', 'Poe-verse', 5), w('b', 'Zed', 12), w('c', 'Empty', 0), w('d', 'Spicy', 9, true), w('e', '  ', 3), w('f', 'Unknown', null)];

  it('hides empty, unnamed and (unless enabled) erotic worlds; keeps worlds with an unknown count', () => {
    expect(visibleWorlds(rows, false).map(x => x.id)).toEqual(['a', 'b', 'f']);
    expect(visibleWorlds(rows, true).map(x => x.id)).toEqual(['a', 'b', 'd', 'f']);
  });
  it('previews the biggest worlds first, then by name, up to the count', () => {
    expect(pickWorlds(rows, true, 3).map(x => x.id)).toEqual(['b', 'd', 'a']);
    expect(pickWorlds(rows, false).map(x => x.id)).toEqual(['b', 'a', 'f']);
  });
  it('copes with nothing', () => {
    expect(pickWorlds([], false)).toEqual([]);
    expect(pickWorlds([null, undefined], false)).toEqual([]);
  });
  it('words the story count', () => {
    expect(storiesLabel(1)).toBe('1 story');
    expect(storiesLabel(0)).toBe('0 stories');
    expect(storiesLabel(7)).toBe('7 stories');
  });
});
