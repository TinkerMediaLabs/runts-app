import { isCommentAllowed, normalizeForFilter } from '../lib/commentFilter';

describe('isCommentAllowed', () => {
  it('allows ordinary comments, including dark story themes', () => {
    expect(isCommentAllowed('Loved the twist at the end!')).toBe(true);
    expect(isCommentAllowed('The narrator was great, a little spooky.')).toBe(true);
    expect(isCommentAllowed('The murderer killed the king in chapter two')).toBe(true);
    expect(isCommentAllowed('')).toBe(true);
  });
  it('does not flag words that merely contain a blocked string', () => {
    expect(isCommentAllowed('Scunthorpe is a town. Class assessment, cocktail, shitake mushrooms')).toBe(true);
    expect(isCommentAllowed('Passionate classic about an assistant')).toBe(true);
    expect(isCommentAllowed('A spicy romance about a bastard prince')).toBe(true);
  });
  it('blocks profanity, endings and obfuscation', () => {
    expect(isCommentAllowed('this is shit')).toBe(false);
    expect(isCommentAllowed('What a fucking ending')).toBe(false);
    expect(isCommentAllowed('f u c k')).toBe(true); // spaced letters are out of scope; reports cover them
    expect(isCommentAllowed('fuuuuck')).toBe(false);
    expect(isCommentAllowed('SH1T')).toBe(false);
    expect(isCommentAllowed('shit!!!')).toBe(false);
    expect(isCommentAllowed('Great story!')).toBe(true);
    expect(isCommentAllowed('b!tch')).toBe(false);
    expect(isCommentAllowed('what an a$$hole')).toBe(false);
  });
  it('blocks harassment phrases', () => {
    expect(isCommentAllowed('just kill yourself')).toBe(false);
    expect(isCommentAllowed('kys')).toBe(false);
  });
});

describe('normalizeForFilter', () => {
  it('collapses repeats, strips accents and look-alikes', () => {
    expect(normalizeForFilter('Héllooo W0rld!!')).toBe('helo world');
  });
});
