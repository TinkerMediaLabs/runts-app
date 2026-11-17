import { cutMp3, mp3Info } from '../lib/mp3Clip';

// Synthetic MPEG-1 Layer III, 128 kbps, 44.1 kHz frames: 417 bytes and 1152 samples (about 26.12 ms) each.
const FRAME_BYTES = 417;
const FRAME_SECONDS = 1152 / 44100;
const frame = () => {
  const f = new Uint8Array(FRAME_BYTES);
  f[0] = 0xff; f[1] = 0xfb; f[2] = 0x90; f[3] = 0x00;
  return f;
};
const join = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let w = 0;
  for (const p of parts) { out.set(p, w); w += p.length; }
  return out;
};
const frames = (n: number) => join(...Array.from({ length: n }, frame));
const id3v2 = (payload: number) => {
  const h = new Uint8Array(10 + payload);
  h.set([0x49, 0x44, 0x33, 4, 0, 0]);
  h[6] = 0; h[7] = 0; h[8] = (payload >> 7) & 0x7f; h[9] = payload & 0x7f;
  return h;
};
const id3v1 = () => { const t = new Uint8Array(128); t.set([0x54, 0x41, 0x47]); return t; };

describe('cutMp3', () => {
  const file = frames(3000);   // about 78 seconds

  it('copies about 30 seconds starting near the asked time', () => {
    const clip = cutMp3(file, 10, 30);
    expect(clip.startSeconds).toBeGreaterThanOrEqual(10);
    expect(clip.startSeconds).toBeLessThan(10 + FRAME_SECONDS * 1.01);
    expect(clip.seconds).toBeGreaterThanOrEqual(30);
    expect(clip.seconds).toBeLessThan(30 + FRAME_SECONDS * 1.01);
    expect(clip.bytes.length % FRAME_BYTES).toBe(0);
    expect(mp3Info(clip.bytes).frames).toBe(clip.bytes.length / FRAME_BYTES);
    expect(clip.totalSeconds).toBeCloseTo(3000 * FRAME_SECONDS, 3);
  });

  it('moves the clip earlier when the file ends before start + length', () => {
    const clip = cutMp3(file, 75, 30);
    expect(clip.seconds).toBeGreaterThanOrEqual(29.9);
    expect(clip.startSeconds + clip.seconds).toBeLessThanOrEqual(clip.totalSeconds + 0.001);
    expect(clip.startSeconds).toBeLessThan(75);
  });

  it('returns the whole file when it is shorter than the clip', () => {
    const short = frames(100);
    const clip = cutMp3(short, 5, 30);
    expect(clip.startSeconds).toBe(0);
    expect(clip.bytes.length).toBe(short.length);
  });

  it('starts at zero for a negative or zero start', () => {
    expect(cutMp3(file, 0, 30).startSeconds).toBe(0);
    expect(cutMp3(file, -5, 30).startSeconds).toBe(0);
  });

  it('skips an ID3v2 tag at the start and an ID3v1 tag at the end', () => {
    const tagged = join(id3v2(500), frames(1200), id3v1());
    const clip = cutMp3(tagged, 0, 10);
    expect(clip.bytes[0]).toBe(0xff);
    expect(clip.bytes.length % FRAME_BYTES).toBe(0);
    expect(mp3Info(tagged).frames).toBe(1200);
  });

  it('skips a Xing header frame', () => {
    const xing = frame();
    xing.set([0x58, 0x69, 0x6e, 0x67], 36);   // "Xing"
    const withXing = join(xing, frames(500));
    expect(mp3Info(withXing).frames).toBe(501);
    const clip = cutMp3(withXing, 0, 5);
    expect(clip.startSeconds).toBe(0);
    expect(clip.totalSeconds).toBeCloseTo(500 * FRAME_SECONDS, 3);
  });

  it('finds the frames after junk bytes at the start', () => {
    const junk = new Uint8Array([1, 2, 3, 0xff, 0x00, 9, 9, 9]);
    const clip = cutMp3(join(junk, frames(800)), 0, 5);
    expect(clip.bytes[0]).toBe(0xff);
    expect(clip.bytes[1]).toBe(0xfb);
  });

  it('throws when the file has no MP3 audio', () => {
    expect(() => cutMp3(new Uint8Array(2000), 0, 30)).toThrow('No MP3 audio');
    expect(() => cutMp3(new Uint8Array(0), 0, 30)).toThrow('No MP3 audio');
  });
});
