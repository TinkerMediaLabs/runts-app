import { offerIsOpen } from '../lib/freePremium';

const now = Date.parse('2027-02-01T12:00:00Z');

describe('offerIsOpen', () => {
  it('is open before the end date and closed at or after it', () => {
    expect(offerIsOpen('2027-03-01T00:00:00Z', now)).toBe(true);
    expect(offerIsOpen('2027-02-01T12:00:00Z', now)).toBe(false);
    expect(offerIsOpen('2027-01-01T00:00:00Z', now)).toBe(false);
  });
  it('is closed when there is no usable date', () => {
    expect(offerIsOpen(null, now)).toBe(false);
    expect(offerIsOpen(undefined, now)).toBe(false);
    expect(offerIsOpen('', now)).toBe(false);
    expect(offerIsOpen('not a date', now)).toBe(false);
  });
});
