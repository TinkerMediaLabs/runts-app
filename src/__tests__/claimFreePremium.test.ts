import { claimFreePremium, threeMonthsFrom, offerIsOpen } from '../../amplify/functions/claim-free-premium/core';

const NOW = Date.parse('2026-12-01T12:00:00Z');
const OPEN = '2027-03-01T00:00:00Z';

const make = (over: Partial<Parameters<typeof claimFreePremium>[1]> = {}) => {
  const calls: string[] = [];
  const deps = {
    offerEnd: jest.fn(async () => OPEN as string | null),
    markClaimed: jest.fn(async (u: string) => { calls.push(`mark:${u}`); return true; }),
    unmarkClaimed: jest.fn(async (u: string) => { calls.push(`unmark:${u}`); }),
    grant: jest.fn(async (u: string, end: number) => { calls.push(`grant:${u}:${new Date(end).toISOString()}`); }),
    now: () => NOW,
    ...over,
  };
  return { calls, deps };
};

describe('threeMonthsFrom', () => {
  it('adds three calendar months', () => {
    expect(new Date(threeMonthsFrom(Date.parse('2026-12-01T12:00:00Z'))).toISOString()).toBe('2027-03-01T12:00:00.000Z');
  });
  it('clamps to the end of a shorter month', () => {
    expect(new Date(threeMonthsFrom(Date.parse('2026-11-30T00:00:00Z'))).toISOString()).toBe('2027-02-28T00:00:00.000Z');
    expect(new Date(threeMonthsFrom(Date.parse('2026-12-31T00:00:00Z'))).toISOString()).toBe('2027-03-31T00:00:00.000Z');
  });
});

describe('offerIsOpen', () => {
  it('needs an end date in the future', () => {
    expect(offerIsOpen(OPEN, NOW)).toBe(true);
    expect(offerIsOpen('2026-11-01T00:00:00Z', NOW)).toBe(false);
    expect(offerIsOpen(null, NOW)).toBe(false);
    expect(offerIsOpen('garbage', NOW)).toBe(false);
  });
});

describe('claimFreePremium', () => {
  it('records the claim, then grants three months', async () => {
    const { calls, deps } = make();
    await expect(claimFreePremium({ sub: 'u1' }, deps)).resolves.toBe('granted');
    expect(calls).toEqual(['mark:u1', 'grant:u1:2027-03-01T12:00:00.000Z']);
  });

  it('refuses without a signed-in identity and touches nothing', async () => {
    for (const identity of [null, undefined, {}]) {
      const { deps } = make();
      await expect(claimFreePremium(identity as any, deps)).rejects.toThrow('Not signed in.');
      expect(deps.markClaimed).not.toHaveBeenCalled();
      expect(deps.grant).not.toHaveBeenCalled();
    }
  });

  it('does nothing when the offer is closed or has no end date', async () => {
    for (const end of [null, '2026-11-01T00:00:00Z']) {
      const { deps } = make({ offerEnd: jest.fn(async () => end) });
      await expect(claimFreePremium({ sub: 'u1' }, deps)).resolves.toBe('offer_closed');
      expect(deps.markClaimed).not.toHaveBeenCalled();
      expect(deps.grant).not.toHaveBeenCalled();
    }
  });

  it('does not grant a second time', async () => {
    const { deps } = make({ markClaimed: jest.fn(async () => false) });
    await expect(claimFreePremium({ sub: 'u1' }, deps)).resolves.toBe('already_claimed');
    expect(deps.grant).not.toHaveBeenCalled();
  });

  it('removes the record when the grant fails, so the person can try again', async () => {
    const { calls, deps } = make({ grant: jest.fn(async () => { throw new Error('RevenueCat down'); }) });
    await expect(claimFreePremium({ sub: 'u1' }, deps)).rejects.toThrow('RevenueCat down');
    expect(calls).toEqual(['mark:u1', 'unmark:u1']);
  });
});
