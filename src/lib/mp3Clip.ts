// Cuts a short clip out of an MP3 by copying whole MP3 frames: no decoding and no re-encoding, so it is fast, lossless
// and needs almost no memory. Used for the 30-second Preview clips of premium stories (the full audio of a premium
// story is never handed to a listener without Premium, so Preview plays this small separate file instead).
//
// Pure (no React Native / DOM imports) so it can be unit tested. The CMS keeps an identical copy at
// runts-admin/src/lib/mp3Clip.ts: keep the two files in sync (compare with `diff`).
//
// Supports MPEG-1/2/2.5 Layer III (the "MP3" every story file is). Handles an ID3v2 tag at the start, an ID3v1 tag at
// the end and a Xing/Info/VBRI header frame, and works for constant and variable bitrate files.

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000],   // MPEG-1
  2: [22050, 24000, 16000],   // MPEG-2
  0: [11025, 12000, 8000],    // MPEG-2.5
};

type FrameInfo = { length: number; seconds: number };

/** Reads the frame header at `pos`; null when it is not a valid MPEG Layer III header. */
function frameAt(b: Uint8Array, pos: number): FrameInfo | null {
  if (pos + 4 > b.length) return null;
  if (b[pos] !== 0xff || (b[pos + 1] & 0xe0) !== 0xe0) return null;
  const version = (b[pos + 1] >> 3) & 3;      // 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5, 1 = reserved
  const layer = (b[pos + 1] >> 1) & 3;        // 1 = Layer III
  if (version === 1 || layer !== 1) return null;
  const bitrateIndex = (b[pos + 2] >> 4) & 15;
  const sampleIndex = (b[pos + 2] >> 2) & 3;
  const padding = (b[pos + 2] >> 1) & 1;
  if (bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) return null;
  const bitrate = (version === 3 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex] * 1000;
  const sampleRate = SAMPLE_RATES[version][sampleIndex];
  const samples = version === 3 ? 1152 : 576;
  const length = Math.floor(((samples / 8) * bitrate) / sampleRate) + padding;
  return { length, seconds: samples / sampleRate };
}

/** Where the audio starts: after an ID3v2 tag if there is one. */
function audioStart(b: Uint8Array): number {
  if (b.length >= 10 && b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) {
    const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
    const footer = (b[5] & 0x10) !== 0 ? 10 : 0;
    return 10 + size + footer;
  }
  return 0;
}

/** Where the audio ends: before an ID3v1 tag if there is one. */
function audioEnd(b: Uint8Array): number {
  const n = b.length;
  if (n >= 128 && b[n - 128] === 0x54 && b[n - 127] === 0x41 && b[n - 126] === 0x47) return n - 128;
  return n;
}

/** A real frame: a valid header whose frame length leads to another valid header (or to the end of the audio). */
function validFrame(b: Uint8Array, pos: number, end: number): FrameInfo | null {
  const f = frameAt(b, pos);
  if (!f || pos + f.length > end) return null;
  const next = pos + f.length;
  if (next + 4 <= end && !frameAt(b, next)) return null;
  return f;
}

const hasTag = (b: Uint8Array, pos: number, tag: string) => {
  for (let i = 0; i < 160 && pos + i + 4 <= b.length; i++) {
    if (b[pos + i] === tag.charCodeAt(0) && b[pos + i + 1] === tag.charCodeAt(1)
      && b[pos + i + 2] === tag.charCodeAt(2) && b[pos + i + 3] === tag.charCodeAt(3)) return true;
  }
  return false;
};

export type Mp3Clip = {
  bytes: Uint8Array;
  startSeconds: number;      // where the clip begins in the original (may be earlier than asked when the file is short)
  seconds: number;           // how long the clip is
  totalSeconds: number;      // length of the original
};

/**
 * Copies about `lengthSeconds` of frames starting at `startSeconds`. When the file is shorter than start + length the
 * clip is moved earlier so it still gets the full length (or the whole file if that is shorter than the length).
 * Throws when no MP3 frames are found.
 */
export function cutMp3(input: Uint8Array, startSeconds: number, lengthSeconds: number): Mp3Clip {
  const end = audioEnd(input);
  let pos = audioStart(input);

  // Pass 1: find every frame (offset, length, start time).
  const offsets: number[] = [];
  const lengths: number[] = [];
  const times: number[] = [];
  let t = 0;
  let first = true;
  while (pos + 4 <= end) {
    const f = validFrame(input, pos, end);
    if (!f) { pos++; continue; }   // resync: skip bytes until a real frame
    const isInfo = first && (hasTag(input, pos, 'Xing') || hasTag(input, pos, 'Info') || hasTag(input, pos, 'VBRI'));
    first = false;
    if (!isInfo) {
      offsets.push(pos); lengths.push(f.length); times.push(t);
      t += f.seconds;
    }
    pos += f.length;
  }
  if (offsets.length === 0) throw new Error('No MP3 audio found in this file');

  const total = t;
  const want = Math.max(0.1, lengthSeconds);
  const start = Math.max(0, Math.min(Math.max(0, startSeconds), total - want));

  // Pass 2: first frame at or after the start, then frames until the clip is long enough.
  let i = 0;
  while (i < offsets.length - 1 && times[i] < start) i++;
  let j = i;
  let seconds = 0;
  let size = 0;
  while (j < offsets.length && seconds < want) {
    size += lengths[j];
    seconds = (j + 1 < offsets.length ? times[j + 1] : total) - times[i];
    j++;
  }

  const out = new Uint8Array(size);
  let w = 0;
  for (let k = i; k < j; k++) {
    out.set(input.subarray(offsets[k], offsets[k] + lengths[k]), w);
    w += lengths[k];
  }
  return { bytes: out, startSeconds: times[i], seconds, totalSeconds: total };
}

/** Counts the frames and total length of an MP3 (used by tests and by the backfill script's sanity check). */
export function mp3Info(input: Uint8Array): { frames: number; seconds: number } {
  const end = audioEnd(input);
  let pos = audioStart(input);
  let frames = 0;
  let seconds = 0;
  while (pos + 4 <= end) {
    const f = validFrame(input, pos, end);
    if (!f) { pos++; continue; }
    frames++; seconds += f.seconds; pos += f.length;
  }
  return { frames, seconds };
}
