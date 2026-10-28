import { generateKeyPairSync, createSign } from 'crypto';
import { preSignUp, defineChallenge, createChallenge, verifyChallenge, type TriggerDeps } from '../../amplify/functions/apple-auth/triggers';
import { APPLE_ISSUER, type Jwk } from '../../amplify/functions/apple-auth/apple';

const b64url = (v: Buffer | string) => Buffer.from(v).toString('base64url');
const NOW = 1_800_000_000;
const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...(rsa.publicKey.export({ format: 'jwk' }) as any), kid: 'K1' } as Jwk;
const token = (over: any = {}) => {
  const input = `${b64url(JSON.stringify({ alg: 'RS256', kid: 'K1' }))}.${b64url(JSON.stringify({
    iss: APPLE_ISSUER, aud: 'com.runtsapp.myapp.dev', exp: NOW + 600, sub: 'apple-1', email: 'Rand@Example.com', email_verified: 'true', nonce: 'n-1', ...over,
  }))}`;
  return `${input}.${b64url(createSign('RSA-SHA256').update(input).sign(rsa.privateKey))}`;
};

const makeDeps = (over: Partial<TriggerDeps> = {}) => {
  const saved: any[] = [];
  const used = new Set<string>();
  const deps: TriggerDeps = {
    loadKeys: async () => [jwk],
    audiences: ['com.runtsapp.myapp.dev'],
    now: () => NOW,
    claimNonce: jest.fn(async (h: string) => { if (used.has(h)) return false; used.add(h); return true; }),
    exchangeCode: jest.fn(async () => 'refresh-1'),
    saveToken: jest.fn(async (r: any) => { saved.push(r); }),
    log: jest.fn(),
    findUsersByEmail: jest.fn(async () => []),
    linkGoogle: jest.fn(async () => {}),
    createVerifiedUser: jest.fn(async () => 'uuid-new'),
    ...over,
  };
  return { deps, saved };
};

const signUpEvent = (meta: any, email = 'rand@example.com', source = 'PreSignUp_SignUp') =>
  ({ triggerSource: source, request: { userAttributes: { email }, clientMetadata: meta }, response: {} });

describe('preSignUp', () => {
  it('confirms a sign-up that carries a valid Apple token for the same email', async () => {
    const { deps } = makeDeps();
    const out = await preSignUp(signUpEvent({ appleIdentityToken: token(), appleNonce: 'n-1' }), deps);
    expect(out.response.autoConfirmUser).toBe(true);
    expect(out.response.autoVerifyEmail).toBe(true);
  });
  it('leaves ordinary sign-ups and Google sign-ins alone', async () => {
    const { deps } = makeDeps();
    expect((await preSignUp(signUpEvent(undefined), deps)).response.autoConfirmUser).toBeUndefined();
    expect((await preSignUp(signUpEvent({ appleIdentityToken: token(), appleNonce: 'n-1' }, 'x@y.com', 'PreSignUp_ExternalProvider'), deps)).response.autoConfirmUser).toBeUndefined();
  });
  it('rejects a mismatched email, an unverified email, a bad nonce and a bad token', async () => {
    const { deps } = makeDeps();
    await expect(preSignUp(signUpEvent({ appleIdentityToken: token(), appleNonce: 'n-1' }, 'other@example.com'), deps)).rejects.toThrow('Email does not match');
    await expect(preSignUp(signUpEvent({ appleIdentityToken: token({ email_verified: 'false' }), appleNonce: 'n-1' }), deps)).rejects.toThrow('not verified');
    await expect(preSignUp(signUpEvent({ appleIdentityToken: token(), appleNonce: 'wrong' }), deps)).rejects.toThrow('Nonce');
    await expect(preSignUp(signUpEvent({ appleIdentityToken: token(), appleNonce: undefined }), deps)).rejects.toThrow('nonce');
    await expect(preSignUp(signUpEvent({ appleIdentityToken: 'junk', appleNonce: 'n-1' }), deps)).rejects.toThrow();
  });
});

describe('preSignUp: one account per email', () => {
  const pool = 'us-east-2_pool';
  const googleEvent = (attrs: any = {}, userName = 'Google_123') =>
    ({ triggerSource: 'PreSignUp_ExternalProvider', userPoolId: pool, userName, request: { userAttributes: { email: 'Rand@Example.com', email_verified: 'true', ...attrs } }, response: {} });
  const native = { username: 'uuid-1', status: 'CONFIRMED', emailVerified: true };

  it('links a Google sign-in to the confirmed, verified email account', async () => {
    const { deps } = makeDeps({ findUsersByEmail: jest.fn(async () => [native]) });
    const out = await preSignUp(googleEvent(), deps);
    expect(deps.linkGoogle).toHaveBeenCalledWith(pool, 'uuid-1', '123');
    expect(deps.findUsersByEmail).toHaveBeenCalledWith(pool, 'Rand@Example.com');
    expect(out.response.autoConfirmUser).toBeUndefined();
  });
  it('creates a verified email account and links Google to it when the address has no account yet', async () => {
    const { deps } = makeDeps();
    await preSignUp(googleEvent(), deps);
    expect(deps.createVerifiedUser).toHaveBeenCalledWith(pool, 'rand@example.com');
    expect(deps.linkGoogle).toHaveBeenCalledWith(pool, 'uuid-new', '123');
  });
  it('keeps Google separate when the address is held by an unconfirmed or unverified account', async () => {
    for (const found of [[{ ...native, status: 'UNCONFIRMED' }], [{ ...native, emailVerified: false }]]) {
      const { deps } = makeDeps({ findUsersByEmail: jest.fn(async () => found) });
      await preSignUp(googleEvent(), deps);
      expect(deps.createVerifiedUser).not.toHaveBeenCalled();
      expect(deps.linkGoogle).not.toHaveBeenCalled();
    }
  });
  it('does not link when Google has not verified the email, or the sign-in is not Google', async () => {
    const { deps } = makeDeps({ findUsersByEmail: jest.fn(async () => [native]) });
    await preSignUp(googleEvent({ email_verified: 'false' }), deps);
    await preSignUp(googleEvent({ email_verified: undefined }), deps);
    await preSignUp(googleEvent({}, 'Facebook_5'), deps);
    expect(deps.linkGoogle).not.toHaveBeenCalled();
    expect(deps.createVerifiedUser).not.toHaveBeenCalled();
  });
  it('refuses an email or Apple sign-up for an address that is already a Google account', async () => {
    const google = { username: 'Google_9', status: 'EXTERNAL_PROVIDER', emailVerified: true };
    const { deps } = makeDeps({ findUsersByEmail: jest.fn(async () => [google]) });
    await expect(preSignUp(signUpEvent(undefined), deps)).rejects.toThrow('already used with Google');
    await expect(preSignUp(signUpEvent({ appleIdentityToken: token(), appleNonce: 'n-1' }), deps)).rejects.toThrow('already used with Google');
  });
  it('lets a sign-up through when the address is free', async () => {
    const { deps } = makeDeps();
    await expect(preSignUp(signUpEvent(undefined), deps)).resolves.toBeDefined();
  });
});

describe('define / create challenge', () => {
  const def = (session: any[], userNotFound = false) => defineChallenge({ request: { session, userNotFound }, response: {} }).response;
  it('issues one custom challenge first, then tokens after a correct answer', () => {
    expect(def([])).toMatchObject({ challengeName: 'CUSTOM_CHALLENGE', issueTokens: false, failAuthentication: false });
    expect(def([{ challengeName: 'CUSTOM_CHALLENGE', challengeResult: true }])).toMatchObject({ issueTokens: true, failAuthentication: false });
  });
  it('fails on a wrong answer, an unknown user, or a non-custom step', () => {
    expect(def([{ challengeName: 'CUSTOM_CHALLENGE', challengeResult: false }]).failAuthentication).toBe(true);
    expect(def([], true).failAuthentication).toBe(true);
    expect(def([{ challengeName: 'SRP_A', challengeResult: true }]).failAuthentication).toBe(true);
  });
  it('createChallenge sets the public marker only for the custom challenge', () => {
    expect(createChallenge({ request: { challengeName: 'CUSTOM_CHALLENGE' }, response: {} }).response.publicChallengeParameters).toEqual({ type: 'APPLE' });
    expect(createChallenge({ request: { challengeName: 'OTHER' }, response: {} }).response.publicChallengeParameters).toBeUndefined();
  });
});

describe('verifyChallenge', () => {
  const ev = (answer: any, email = 'rand@example.com') =>
    ({ request: { challengeAnswer: JSON.stringify(answer), userAttributes: { email, sub: 'cog-1' } }, response: {} });
  const good = (over: any = {}) => ({ identityToken: token(), nonce: 'n-1', authorizationCode: 'code-1', ...over });

  it('accepts a good answer and stores Apple\'s refresh token for the user', async () => {
    const { deps, saved } = makeDeps();
    const out = await verifyChallenge(ev(good()), deps);
    expect(out.response.answerCorrect).toBe(true);
    expect(deps.exchangeCode).toHaveBeenCalledWith('code-1', 'com.runtsapp.myapp.dev');
    expect(saved).toEqual([{ userSub: 'cog-1', appleSub: 'apple-1', clientId: 'com.runtsapp.myapp.dev', refreshToken: 'refresh-1' }]);
  });
  it('rejects a replay of the same sign-in', async () => {
    const { deps } = makeDeps();
    expect((await verifyChallenge(ev(good()), deps)).response.answerCorrect).toBe(true);
    expect((await verifyChallenge(ev(good()), deps)).response.answerCorrect).toBe(false);
  });
  it('rejects a bad token, another person\'s email, a wrong nonce and malformed answers', async () => {
    const { deps } = makeDeps();
    expect((await verifyChallenge(ev(good({ identityToken: 'junk' })), deps)).response.answerCorrect).toBe(false);
    expect((await verifyChallenge(ev(good(), 'other@example.com'), deps)).response.answerCorrect).toBe(false);
    expect((await verifyChallenge(ev(good({ nonce: 'wrong' })), deps)).response.answerCorrect).toBe(false);
    expect((await verifyChallenge({ request: { challengeAnswer: 'not json' }, response: {} }, deps)).response.answerCorrect).toBe(false);
    expect(deps.exchangeCode).not.toHaveBeenCalled();
  });
  it('still signs the user in when keeping Apple\'s token fails, and logs it', async () => {
    const { deps } = makeDeps({ exchangeCode: jest.fn(async () => { throw new Error('apple down'); }) });
    const out = await verifyChallenge(ev(good()), deps);
    expect(out.response.answerCorrect).toBe(true);
    expect(deps.log).toHaveBeenCalledWith('APPLE_TOKEN_STORE_FAILED', 'apple down');
  });
  it('signs in without storing anything when no authorization code was sent', async () => {
    const { deps, saved } = makeDeps();
    const out = await verifyChallenge(ev(good({ authorizationCode: undefined })), deps);
    expect(out.response.answerCorrect).toBe(true);
    expect(saved).toEqual([]);
  });
});
