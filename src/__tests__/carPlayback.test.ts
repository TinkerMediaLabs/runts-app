import { endedNaturally, ENDED_WITHIN_SECONDS } from '../lib/carPlayback';

describe('car queue: did the previous story end by itself?', () => {
  it('is true near the end and false when skipped early', () => {
    expect(endedNaturally(1000, 1010)).toBe(true);
    expect(endedNaturally(1010 - ENDED_WITHIN_SECONDS, 1010)).toBe(true);
    expect(endedNaturally(500, 1010)).toBe(false);
  });
  it('is false when position or duration is unknown', () => {
    expect(endedNaturally(undefined, 1000)).toBe(false);
    expect(endedNaturally(100, undefined)).toBe(false);
    expect(endedNaturally(0, 0)).toBe(false);
  });
});
