// Sign in with Apple helpers: check an Apple identity token, build the signed client secret Apple asks for,
// and exchange / revoke tokens. Pure functions with the network call passed in, so they can be tested.
// Uses only Node's built-in crypto.
import { createHash, createPrivateKey, createPublicKey, createSign, createVerify } from 'crypto';

export const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS_URL = `${APPLE_ISSUER}/auth/keys`;
const APPLE_TOKEN_URL = `${APPLE_ISSUER}/auth/token`;
const APPLE_REVOKE_URL = `${APPLE_ISSUER}/auth/revoke`;

export type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json: () => Promise<any>; text: () => Promise<string> }>;
export type Jwk = { kty: string; kid: string; use?: string; alg?: string; n: string; e: string };

export type AppleClaims = { sub: string; email?: string; email_verified?: boolean | string; is_private_email?: boolean | string; aud: string; nonce?: string };

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');
const fromB64url = (s: string) => Buffer.from(s, 'base64url');

function parseJwt(token: string) {
  const parts = (token ?? '').split('.');
  if (parts.length !== 3) throw new Error('Malformed identity token.');
  try {
    return {
      header: JSON.parse(fromB64url(parts[0]).toString('utf8')),
      payload: JSON.parse(fromB64url(parts[1]).toString('utf8')),
      signingInput: `${parts[0]}.${parts[1]}`,
      signature: fromB64url(parts[2]),
    };
  } catch {
    throw new Error('Malformed identity token.');
  }
}

/** Reads the (unverified) subject out of a token, for deciding which user to look up. Never trust it alone. */
export function peekSubject(token: string): string | null {
  try { return parseJwt(token).payload?.sub ?? null; } catch { return null; }
}

export function nonceMatches(claim: string | undefined, rawNonce: string): boolean {
  if (!claim || !rawNonce) return false;
  const hashed = createHash('sha256').update(rawNonce).digest('hex');
  return claim === rawNonce || claim === hashed;
}

export type VerifyOptions = {
  jwks: Jwk[];
  audiences: string[];          // the app bundle ids allowed for this environment
  rawNonce?: string;            // when given, the token must carry it (or its SHA-256)
  nowSeconds?: number;
};

/** Checks signature, issuer, audience, expiry and (optionally) nonce. Throws on any problem. */
export function verifyIdentityToken(token: string, opts: VerifyOptions): AppleClaims {
  const { header, payload, signingInput, signature } = parseJwt(token);
  if (header.alg !== 'RS256') throw new Error('Unexpected token algorithm.');
  const jwk = opts.jwks.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('Unknown signing key.');
  const key = createPublicKey({ key: jwk as any, format: 'jwk' });
  const ok = createVerify('RSA-SHA256').update(signingInput).verify(key, signature);
  if (!ok) throw new Error('Bad token signature.');
  if (payload.iss !== APPLE_ISSUER) throw new Error('Wrong token issuer.');
  if (!opts.audiences.includes(payload.aud)) throw new Error('Token is for a different app.');
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('Token expired.');
  if (!payload.sub) throw new Error('Token has no subject.');
  if (opts.rawNonce !== undefined && !nonceMatches(payload.nonce, opts.rawNonce)) throw new Error('Nonce mismatch.');
  return payload as AppleClaims;
}

export async function fetchAppleKeys(fetchFn: FetchLike): Promise<Jwk[]> {
  const res = await fetchFn(APPLE_KEYS_URL);
  if (!res.ok) throw new Error(`Could not load Apple keys (${res.status}).`);
  const body = await res.json();
  return body?.keys ?? [];
}

export type ClientSecretInput = {
  teamId: string;
  keyId: string;
  clientId: string;             // bundle id (native) or services id (web)
  privateKeyPem: string;        // contents of the .p8 file
  nowSeconds?: number;
  lifetimeSeconds?: number;
};

/** The "client secret" Apple wants is a short-lived ES256 JWT signed with the .p8 key. */
export function buildClientSecret(i: ClientSecretInput): string {
  const now = i.nowSeconds ?? Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: i.keyId, typ: 'JWT' };
  const claims = { iss: i.teamId, iat: now, exp: now + (i.lifetimeSeconds ?? 300), aud: APPLE_ISSUER, sub: i.clientId };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const sig = createSign('SHA256').update(signingInput).sign({ key: createPrivateKey(i.privateKeyPem), dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${b64url(sig)}`;
}

const form = (fields: Record<string, string>) => new URLSearchParams(fields).toString();
const formInit = (fields: Record<string, string>) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: form(fields),
});

/** Trades the one-time authorization code from the Apple sheet for Apple's refresh token. */
export async function exchangeAuthorizationCode(
  fetchFn: FetchLike,
  p: { code: string; clientId: string; clientSecret: string },
): Promise<{ refreshToken: string }> {
  const res = await fetchFn(APPLE_TOKEN_URL, formInit({
    grant_type: 'authorization_code', code: p.code, client_id: p.clientId, client_secret: p.clientSecret,
  }));
  if (!res.ok) throw new Error(`Apple token exchange failed (${res.status}).`);
  const body = await res.json();
  if (!body?.refresh_token) throw new Error('Apple returned no refresh token.');
  return { refreshToken: body.refresh_token };
}

/** Tells Apple the user no longer uses this app with Sign in with Apple (required when deleting an account). */
export async function revokeRefreshToken(
  fetchFn: FetchLike,
  p: { token: string; clientId: string; clientSecret: string },
): Promise<void> {
  const res = await fetchFn(APPLE_REVOKE_URL, formInit({
    token: p.token, token_type_hint: 'refresh_token', client_id: p.clientId, client_secret: p.clientSecret,
  }));
  if (!res.ok) throw new Error(`Apple token revoke failed (${res.status}).`);
}
