import { tagTileColors, darken, hashText, tileInitial, TILE_PALETTE } from '../lib/tagTileColors';

describe('tag tile colours', () => {
  it('gives the same genre the same colours every time', () => {
    expect(tagTileColors('abc-123')).toEqual(tagTileColors('abc-123'));
  });
  it('always picks a pair from the palette when the tag has no colour', () => {
    for (const id of ['a', 'b', 'c', 'e0ca6ad5-455d-4cce-b184-fc6fc60be4c7', '']) {
      expect(TILE_PALETTE).toContainEqual(tagTileColors(id));
    }
  });
  it('uses the tag colour, darkened, when there is one', () => {
    expect(tagTileColors('x', '#ff8000')).toEqual(['#994d00', '#402000']);
  });
  it('ignores a colour that is not a six digit hex', () => {
    expect(TILE_PALETTE).toContainEqual(tagTileColors('x', 'red'));
    expect(TILE_PALETTE).toContainEqual(tagTileColors('x', '#fff'));
    expect(TILE_PALETTE).toContainEqual(tagTileColors('x', null));
  });
  it('darkens toward black', () => {
    expect(darken('#ffffff', 0)).toBe('#000000');
    expect(darken('#ffffff', 1)).toBe('#ffffff');
    expect(darken('nope', 0.5)).toBeNull();
  });
  it('hashes the same text to the same number', () => {
    expect(hashText('mystery')).toBe(hashText('mystery'));
    expect(hashText('mystery')).not.toBe(hashText('horror'));
  });
  it('takes the first letter or digit for the big initial', () => {
    expect(tileInitial('mystery')).toBe('M');
    expect(tileInitial('  1920s Chicago')).toBe('1');
    expect(tileInitial('')).toBe('#');
    expect(tileInitial(undefined)).toBe('#');
  });
});
