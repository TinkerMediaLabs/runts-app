import {
  cleanContent, cleanId, displayName, isRateLimited, CommentError,
  RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW_MS,
} from '../../amplify/functions/comment-write/core';
import { COMMENT_MAX_LENGTH, COMMENT_REJECTED_MESSAGE } from '../../amplify/functions/comment-write/commentFilter';
import { commentErrorMessage } from '../lib/commentErrors';
import { COMMENT_RATE_LIMIT_MESSAGE } from '../lib/commentFilter';

const NOW = Date.UTC(2026, 9, 30, 12, 0, 0);
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('cleanContent', () => {
  it('trims and returns good text', () => {
    expect(cleanContent('  Loved this one  ')).toBe('Loved this one');
  });
  it('rejects empty, blank and non-string input', () => {
    expect(() => cleanContent('')).toThrow(CommentError);
    expect(() => cleanContent('   ')).toThrow(CommentError);
    expect(() => cleanContent(undefined)).toThrow(CommentError);
    expect(() => cleanContent(42)).toThrow(CommentError);
  });
  it('rejects text over the limit but accepts exactly the limit', () => {
    expect(cleanContent('a'.repeat(COMMENT_MAX_LENGTH))).toHaveLength(COMMENT_MAX_LENGTH);
    expect(() => cleanContent('a'.repeat(COMMENT_MAX_LENGTH + 1))).toThrow(CommentError);
  });
  it('rejects blocked language with the message the app shows', () => {
    expect(() => cleanContent('you are a b1tch')).toThrow(COMMENT_REJECTED_MESSAGE);
  });
});

describe('isRateLimited', () => {
  it('allows when fewer than the limit were posted', () => {
    expect(isRateLimited([ago(1000), ago(2000)], NOW)).toBe(false);
  });
  it('blocks when the limit was reached inside the window', () => {
    const recent = Array.from({ length: RATE_LIMIT_COUNT }, (_, i) => ago(1000 * (i + 1)));
    expect(isRateLimited(recent, NOW)).toBe(true);
  });
  it('allows once the oldest of the last comments is outside the window', () => {
    const recent = Array.from({ length: RATE_LIMIT_COUNT }, (_, i) => ago(RATE_LIMIT_WINDOW_MS + 1000 * (i + 1)));
    expect(isRateLimited(recent, NOW)).toBe(false);
  });
});

describe('displayName', () => {
  it('uses Anonymous when asked or when there is no name', () => {
    expect(displayName(true, 'Randy')).toBe('Anonymous');
    expect(displayName(false, '')).toBe('Anonymous');
    expect(displayName(false, undefined)).toBe('Anonymous');
  });
  it('uses the profile name otherwise', () => {
    expect(displayName(false, ' Randy ')).toBe('Randy');
  });
});

describe('cleanId', () => {
  it('accepts ids and rejects odd input', () => {
    expect(cleanId('abc-123_DEF')).toBe('abc-123_DEF');
    expect(() => cleanId('')).toThrow(CommentError);
    expect(() => cleanId('a b')).toThrow(CommentError);
    expect(() => cleanId(null)).toThrow(CommentError);
  });
});

describe('commentErrorMessage', () => {
  it('recognises the server messages even when wrapped', () => {
    expect(commentErrorMessage(new Error(`Post comment failed: ${COMMENT_REJECTED_MESSAGE}`), 'x')).toBe(COMMENT_REJECTED_MESSAGE);
    expect(commentErrorMessage(new Error(`Post comment failed: ${COMMENT_RATE_LIMIT_MESSAGE}`), 'x')).toBe(COMMENT_RATE_LIMIT_MESSAGE);
  });
  it('falls back for anything else', () => {
    expect(commentErrorMessage(new Error('Network request failed'), 'fallback')).toBe('fallback');
    expect(commentErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
