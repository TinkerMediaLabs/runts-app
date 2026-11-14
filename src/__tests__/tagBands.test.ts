import { bandOf, liveTagBandOf, BAND_SECONDS } from '../../amplify/functions/tag-index-sync/bands';

describe('bandOf', () => {
  it('uses 15-minute steps', () => {
    expect(BAND_SECONDS).toBe(900);
    expect(bandOf(1)).toBe(0);
    expect(bandOf(899)).toBe(0);      // 14:59
    expect(bandOf(900)).toBe(1);      // 15:00
    expect(bandOf(1799)).toBe(1);
    expect(bandOf(1800)).toBe(2);     // 30:00
    expect(bandOf(3600)).toBe(4);     // 60:00
    expect(bandOf(5400)).toBe(6);     // 90:00
  });
  it('is undefined for missing or invalid durations', () => {
    expect(bandOf(undefined)).toBeUndefined();
    expect(bandOf(null)).toBeUndefined();
    expect(bandOf('')).toBeUndefined();
    expect(bandOf(0)).toBeUndefined();
    expect(bandOf(-5)).toBeUndefined();
    expect(bandOf('abc')).toBeUndefined();
  });
  it('accepts a numeric string (raw DynamoDB value)', () => {
    expect(bandOf('1200')).toBe(1);
  });
});

describe('liveTagBandOf', () => {
  it('combines tag and band while live', () => {
    expect(liveTagBandOf('tag1', true, 2)).toBe('tag1#2');
    expect(liveTagBandOf('tag1', true, 0)).toBe('tag1#0');
  });
  it('is undefined when not live, no tag or no band', () => {
    expect(liveTagBandOf('tag1', false, 2)).toBeUndefined();
    expect(liveTagBandOf(undefined, true, 2)).toBeUndefined();
    expect(liveTagBandOf('tag1', true, undefined)).toBeUndefined();
  });
});
