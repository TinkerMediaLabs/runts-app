import { createHmac, timingSafeEqual } from 'node:crypto';

// A "car pass" is a small signed token the player library sends with its progress posts while the app is closed
// (a normal sign-in token expires within the hour). It names one user and can do one thing: report listening
// progress. Format: base64url(JSON) + "." + base64url(HMAC-SHA256). No lookup is needed to check it.

export const PASS_DAYS = 30;
export type PassClaims = { u: string; o: string; exp: number }; // user id, owner string, expiry (epoch seconds)

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const mac = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest();

export function signPass(claims: { userId: string; owner: string }, secret: string, nowMs: number): { pass: string; expiresAt: string } {
  const exp = Math.floor(nowMs / 1000) + PASS_DAYS * 24 * 60 * 60;
  const payload = b64(JSON.stringify({ u: claims.userId, o: claims.owner, exp } satisfies PassClaims));
  return { pass: `${payload}.${b64(mac(payload, secret))}`, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifyPass(token: string | undefined, secret: string, nowMs: number): { userId: string; owner: string } | null {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = mac(payload, secret);
  let given: Buffer;
  try { given = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const c = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as PassClaims;
    if (typeof c.u !== 'string' || !c.u || typeof c.o !== 'string' || typeof c.exp !== 'number') return null;
    if (c.exp * 1000 <= nowMs) return null;
    return { userId: c.u, owner: c.o };
  } catch {
    return null;
  }
}
