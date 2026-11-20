import { savingsPercent } from '../lib/savings';

describe('savingsPercent', () => {
  it('works out the yearly saving against twelve monthly payments', () => {
    expect(savingsPercent(59.99, 5.99)).toBe(17);
    expect(savingsPercent(50, 10)).toBe(58);
  });
  it('is 0 when there is no saving or the prices are missing', () => {
    expect(savingsPercent(120, 10)).toBe(0);
    expect(savingsPercent(130, 10)).toBe(0);
    expect(savingsPercent(null, 10)).toBe(0);
    expect(savingsPercent(60, undefined)).toBe(0);
    expect(savingsPercent(0, 10)).toBe(0);
  });
});
