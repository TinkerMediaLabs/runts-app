import { COMMENT_REJECTED_MESSAGE, COMMENT_RATE_LIMIT_MESSAGE } from './commentFilter';

// The server's reply to a rejected comment arrives wrapped ("Post comment failed: ..."). Show the specific
// messages we know and fall back to a generic one for everything else (network errors, outages).
export function commentErrorMessage(err: unknown, fallback: string): string {
  const message = String((err as any)?.message ?? '');
  if (message.includes(COMMENT_REJECTED_MESSAGE)) return COMMENT_REJECTED_MESSAGE;
  if (message.includes(COMMENT_RATE_LIMIT_MESSAGE)) return COMMENT_RATE_LIMIT_MESSAGE;
  return fallback;
}
