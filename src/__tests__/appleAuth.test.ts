import { createHash, createVerify, generateKeyPairSync, createSign } from 'crypto';
import {
  verifyIdentityToken, buildClientSecret, exchangeAuthorizationCode, revokeRefreshToken, nonceMatches, peekSubject,
  APPLE_ISSUER, type Jwk,
} from '../../amplify/functions/apple-auth/apple';

const b64url = (v: Buffer | string) => Buffer.from(v).toString('base64url');
const NOW = 1_800_000_000;

const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...(rsa.publicKey.export({ format: 'jwk' }) as any), kid: 'K1', use: 'sig', alg: 'RS256' } as Jwk;

function signToken(claims: any, opts: { kid?: string; alg?: string; key?: any } = {}) {
  const header = { alg: opts.alg ?? 'RS256', kid: opts.kid ?? 'K1' };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const sig = createSign('RSA-SHA256').update(input).sign(opts.key ?? rsa.privateKey);
  return `${input}.${b64url(sig)}`;
}
const goodClaims = (over: any = {}) => ({ iss: APPLE_ISSUER, aud: 'com.runtsapp.myapp', exp: NOW + 600, sub: 'apple-sub-1', email: 'a@b.com', ...over });
const opts = (over: any = {}) => ({ jwks: [jwk], audiences: ['com.runtsapp.myapp'], nowSeconds: NOW, ...over });

describe('verifyIdentityToken', () => {
  it('accepts a valid token and returns the claims', () => {
    const c = verifyIdentityToken(signToken(goodClaims()), opts());
    expect(c.sub).toBe('apple-sub-1');
    expect(c.email).toBe('a@b.com');
  });
  it('rejects a tampered payload', () => {
    const t = signToken(goodClaims());
    const [h, , s] = t.split('.');
    const forged = `${h}.${b64url(JSON.stringify(goodClaims({ sub: 'someone-else' })))}.${s}`;
    expect(() => verifyIdentityToken(forged, opts())).toThrow('Bad token signature');
  });
  it('rejects a token signed with a different key', () => {
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
    expect(() => verifyIdentityToken(signToken(goodClaims(), { key: other.privateKey }), opts())).toThrow('Bad token signature');
  });
  it('rejects the wrong issuer, audience, expired tokens and unknown keys', () => {
    expect(() => verifyIdentityToken(signToken(goodClaims({ iss: 'https://evil.example' })), opts())).toThrow('issuer');
    expect(() => verifyIdentityToken(signToken(goodClaims({ aud: 'com.other.app' })), opts())).toThrow('different app');
    expect(() => verifyIdentityToken(signToken(goodClaims({ exp: NOW - 1 })), opts())).toThrow('expired');
    expect(() => verifyIdentityToken(signToken(goodClaims(), { kid: 'nope' }), opts())).toThrow('Unknown signing key');
  });
  it('rejects non-RS256 algorithms and malformed tokens', () => {
    expect(() => verifyIdentityToken(signToken(goodClaims(), { alg: 'none' }), opts())).toThrow('algorithm');
    expect(() => verifyIdentityToken('not-a-token', opts())).toThrow('Malformed');
    expect(() => verifyIdentityToken('a.b.c', opts())).toThrow('Malformed');
  });
  it('requires the nonce when one is expected (raw or SHA-256 form)', () => {
    const hashed = createHash('sha256').update('raw-nonce').digest('hex');
    expect(() => verifyIdentityToken(signToken(goodClaims({ nonce: hashed })), opts({ rawNonce: 'raw-nonce' }))).not.toThrow();
    expect(() => verifyIdentityToken(signToken(goodClaims({ nonce: 'raw-nonce' })), opts({ rawNonce: 'raw-nonce' }))).not.toThrow();
    expect(() => verifyIdentityToken(signToken(goodClaims({ nonce: 'x' })), opts({ rawNonce: 'raw-nonce' }))).toThrow('Nonce');
    expect(() => verifyIdentityToken(signToken(goodClaims()), opts({ rawNonce: 'raw-nonce' }))).toThrow('Nonce');
  });
  it('allows any of several app ids (dev, staging, production bundles)', () => {
    const t = signToken(goodClaims({ aud: 'com.runtsapp.myapp.staging' }));
    expect(() => verifyIdentityToken(t, opts({ audiences: ['com.runtsapp.myapp', 'com.runtsapp.myapp.staging'] }))).not.toThrow();
  });
});

describe('helpers', () => {
  it('nonceMatches and peekSubject', () => {
    expect(nonceMatches(undefined, 'a')).toBe(false);
    expect(nonceMatches('a', '')).toBe(false);
    expect(peekSubject(signToken(goodClaims()))).toBe('apple-sub-1');
    expect(peekSubject('garbage')).toBeNull();
  });
});

describe('buildClientSecret', () => {
  it('makes an ES256 JWT with the claims Apple requires, verifiable with the public key', () => {
    const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const pem = ec.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    const secret = buildClientSecret({ teamId: 'TEAM123456', keyId: 'KEY1234567', clientId: 'com.runtsapp.myapp', privateKeyPem: pem, nowSeconds: NOW });
    const [h, c, s] = secret.split('.');
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({ alg: 'ES256', kid: 'KEY1234567', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(c, 'base64url').toString())).toEqual({ iss: 'TEAM123456', iat: NOW, exp: NOW + 300, aud: APPLE_ISSUER, sub: 'com.runtsapp.myapp' });
    const ok = createVerify('SHA256').update(`${h}.${c}`).verify({ key: ec.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
    expect(ok).toBe(true);
  });
});

describe('Apple token calls', () => {
  const res = (ok: boolean, status: number, body: any = {}) => ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) });

  it('exchanges the authorization code for a refresh token', async () => {
    const fetchFn = jest.fn(async () => res(true, 200, { refresh_token: 'r-123', access_token: 'a' }));
    await expect(exchangeAuthorizationCode(fetchFn as any, { code: 'c1', clientId: 'cid', clientSecret: 'sec' })).resolves.toEqual({ refreshToken: 'r-123' });
    const [url, init] = fetchFn.mock.calls[0] as any;
    expect(url).toBe('https://appleid.apple.com/auth/token');
    expect(init.method).toBe('POST');
    const body = new URLSearchParams(init.body);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('c1');
    expect(body.get('client_id')).toBe('cid');
    expect(body.get('client_secret')).toBe('sec');
  });
  it('fails when Apple refuses or sends no refresh token', async () => {
    await expect(exchangeAuthorizationCode((async () => res(false, 400)) as any, { code: 'c', clientId: 'x', clientSecret: 'y' })).rejects.toThrow('400');
    await expect(exchangeAuthorizationCode((async () => res(true, 200, {})) as any, { code: 'c', clientId: 'x', clientSecret: 'y' })).rejects.toThrow('no refresh token');
  });
  it('revokes a refresh token', async () => {
    const fetchFn = jest.fn(async () => res(true, 200));
    await revokeRefreshToken(fetchFn as any, { token: 'r-123', clientId: 'cid', clientSecret: 'sec' });
    const [url, init] = fetchFn.mock.calls[0] as any;
    expect(url).toBe('https://appleid.apple.com/auth/revoke');
    const body = new URLSearchParams(init.body);
    expect(body.get('token')).toBe('r-123');
    expect(body.get('token_type_hint')).toBe('refresh_token');
  });
  it('reports a failed revoke', async () => {
    await expect(revokeRefreshToken((async () => res(false, 401)) as any, { token: 't', clientId: 'x', clientSecret: 'y' })).rejects.toThrow('401');
  });
});
