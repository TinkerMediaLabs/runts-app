import {
  isCommentAllowed,
  COMMENT_REJECTED_MESSAGE,
  COMMENT_MAX_LENGTH,
} from './commentFilter';

export const RATE_LIMIT_COUNT = 5;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export class CommentError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CommentError.prototype);   // keeps `instanceof` working when classes are down-leveled
  }
}

// Returns the trimmed text, or throws a CommentError the app can show.
export function cleanContent(raw: unknown): string {
  if (typeof raw !== 'string') throw new CommentError('Write a comment first.');
  const text = raw.trim();
  if (!text) throw new CommentError('Write a comment first.');
  if (text.length > COMMENT_MAX_LENGTH) throw new CommentError(`Comments can be up to ${COMMENT_MAX_LENGTH} characters.`);
  if (!isCommentAllowed(text)) throw new CommentError(COMMENT_REJECTED_MESSAGE);
  return text;
}

// `recentCreatedAt` is this person's newest comments, newest first, at most RATE_LIMIT_COUNT of them.
// They are over the limit when they already posted RATE_LIMIT_COUNT within the window.
export function isRateLimited(recentCreatedAt: string[], nowMs: number): boolean {
  if (recentCreatedAt.length < RATE_LIMIT_COUNT) return false;
  const oldest = Date.parse(recentCreatedAt[RATE_LIMIT_COUNT - 1]);
  return Number.isFinite(oldest) && nowMs - oldest < RATE_LIMIT_WINDOW_MS;
}

export function displayName(anonymous: boolean, profileName: string | undefined | null): string {
  if (anonymous) return 'Anonymous';
  const name = (profileName ?? '').trim();
  return name ? name.slice(0, 80) : 'Anonymous';
}

const ID = /^[A-Za-z0-9_-]{1,128}$/;
export function cleanId(raw: unknown): string {
  if (typeof raw !== 'string' || !ID.test(raw)) throw new CommentError('Invalid request.');
  return raw;
}
