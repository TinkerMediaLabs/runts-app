import { decodeAppleClaims, makeNonce, makeThrowawayPassword, fullNameOf, friendlyAppleError } from '../lib/appleSignIn';

const tok = (claims: any) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

describe('appleSignIn helpers', () => {
  it('reads sub and email from an identity token, and survives junk', () => {
    expect(decodeAppleClaims(tok({ sub: 'a1', email: 'x@y.com' }))).toEqual({ sub: 'a1', email: 'x@y.com' });
    expect(decodeAppleClaims(tok({ sub: 'a1' }))).toEqual({ sub: 'a1', email: undefined });
    expect(decodeAppleClaims('junk')).toEqual({});
    expect(decodeAppleClaims('')).toEqual({});
  });
  it('builds a hex nonce and a password that meets the pool rule', () => {
    const bytes = new Uint8Array([1, 2, 255, 16]);
    expect(makeNonce(bytes)).toBe('0102ff10');
    const pw = makeThrowawayPassword(bytes);
    expect(pw).toBe('Aa1!0102ff10');
    expect(pw).toMatch(/[A-Z]/); expect(pw).toMatch(/[a-z]/); expect(pw).toMatch(/[0-9]/); expect(pw).toMatch(/[^A-Za-z0-9]/);
  });
  it('joins the first-time name', () => {
    expect(fullNameOf({ givenName: 'Randy', familyName: 'Myers' })).toBe('Randy Myers');
    expect(fullNameOf({ givenName: 'Randy', familyName: null })).toBe('Randy');
    expect(fullNameOf(null)).toBeUndefined();
    expect(fullNameOf({ givenName: '', familyName: '' })).toBeUndefined();
  });
  it('gives quiet or friendly errors', () => {
    expect(friendlyAppleError({ code: 'ERR_REQUEST_CANCELED' })).toBe('');
    expect(friendlyAppleError({ message: 'PreSignUp failed with error This email is already used with Google.' })).toContain('Google');
    expect(friendlyAppleError({ message: 'PreSignUp failed with error Email does not match the Apple account.' })).toContain('match');
    expect(friendlyAppleError({ message: 'This Apple sign-in was already used.' })).toContain('expired');
    expect(friendlyAppleError(new Error('boom'))).toContain('Could not sign in');
  });
});
