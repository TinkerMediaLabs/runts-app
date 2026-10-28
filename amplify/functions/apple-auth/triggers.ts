// The Cognito sign-in triggers for native Sign in with Apple, with every outside call passed in so the rules can be
// tested. Flow:
//   1. App signs up the user with the Apple identity token in the request metadata -> preSignUp checks it and confirms
//      the user (no email code, Apple already verified the address).
//   2. App signs in with the custom flow -> define/create issue one challenge -> verifyChallenge checks the Apple token
//      again, refuses a nonce that was already used, then (best effort) swaps the one-time code for Apple's refresh
//      token and stores it, so the token can be revoked when the user deletes their account.
import { createHash } from 'crypto';
import { verifyIdentityToken, type Jwk } from './apple';

export type TriggerDeps = {
  loadKeys: () => Promise<Jwk[]>;
  audiences: string[];                                   // allowed app bundle ids for this environment
  now?: () => number;                                    // seconds, for tests
  claimNonce: (nonceHash: string) => Promise<boolean>;   // false when this nonce was used before
  exchangeCode: (code: string, clientId: string) => Promise<string>;   // returns Apple's refresh token
  saveToken: (rec: { userSub: string; appleSub: string; clientId: string; refreshToken: string }) => Promise<void>;
  log: (message: string, extra?: unknown) => void;
  // Accounts in the pool that share an email address (any sign-in type), and the call that attaches a Google
  // identity to an existing email account.
  findUsersByEmail: (poolId: string, email: string) => Promise<PoolUser[]>;
  linkGoogle: (poolId: string, existingUsername: string, googleSub: string) => Promise<void>;
  // Makes a confirmed, email-verified account with no usable password; returns its username.
  createVerifiedUser: (poolId: string, email: string) => Promise<string>;
};

export type PoolUser = { username: string; status: string; emailVerified: boolean };

const GOOGLE_PREFIX = 'Google_';
const isGoogleUser = (u: PoolUser) => u.username.startsWith(GOOGLE_PREFIX);

const isTrue = (v: unknown) => v === true || v === 'true';
const lower = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

async function check(token: string, rawNonce: string | undefined, deps: TriggerDeps) {
  if (!token) throw new Error('Missing Apple identity token.');
  if (!rawNonce) throw new Error('Missing nonce.');
  return verifyIdentityToken(token, {
    jwks: await deps.loadKeys(), audiences: deps.audiences, rawNonce, nowSeconds: deps.now?.(),
  });
}

/**
 * Runs before Cognito creates a user.
 *  - Google sign-in with an email that already has a confirmed, verified email/Apple account: attach the Google
 *    identity to that account, so the person lands in the account they already have instead of a second one.
 *  - Email or Apple sign-up for an address that already exists as a stand-alone Google account: refuse with a clear
 *    message, so no duplicate is created.
 *  - Apple sign-up carrying an Apple token: check it and confirm the user (Apple already verified the address).
 * Everything else is left alone.
 */
export async function preSignUp(event: any, deps: TriggerDeps): Promise<any> {
  if (event.triggerSource === 'PreSignUp_ExternalProvider') return linkExternal(event, deps);
  if (event.triggerSource !== 'PreSignUp_SignUp') return event;

  const email = lower(event.request?.userAttributes?.email);
  if (email) {
    const existing = await deps.findUsersByEmail(event.userPoolId, String(event.request.userAttributes.email).trim());
    if (existing.some(isGoogleUser)) {
      throw new Error('This email is already used with Google. Continue with Google to sign in.');
    }
  }

  const meta = event.request?.clientMetadata ?? {};
  if (!meta.appleIdentityToken) return event;

  const claims = await check(meta.appleIdentityToken, meta.appleNonce, deps);
  if (!email || email !== lower(claims.email)) throw new Error('Email does not match the Apple account.');
  if (!isTrue(claims.email_verified)) throw new Error('Apple has not verified this email.');

  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;
  return event;
}

// A Google sign-in always ends up attached to an email account, so Apple or email sign-in with the same address later
// reaches the same person. If an account for the address exists it is used; if none exists one is created first.
// Only a confirmed account whose email is verified can take a Google identity: an unconfirmed or unverified one could
// have been created by someone else with this address, and linking would hand them the Google user's session. If the
// address is held by an account like that, the Google user is left as a separate sign-in rather than merged.
async function linkExternal(event: any, deps: TriggerDeps): Promise<any> {
  const attrs = event.request?.userAttributes ?? {};
  const email = lower(attrs.email);
  const userName: string = event.userName ?? '';
  if (!email || !isTrue(attrs.email_verified) || !userName.startsWith(GOOGLE_PREFIX)) return event;

  const users = (await deps.findUsersByEmail(event.userPoolId, String(attrs.email).trim())).filter(u => !isGoogleUser(u));
  let target = users.find(u => u.status === 'CONFIRMED' && u.emailVerified)?.username;
  if (!target && users.length === 0) target = await deps.createVerifiedUser(event.userPoolId, email);
  if (!target) return event;

  await deps.linkGoogle(event.userPoolId, target, userName.slice(GOOGLE_PREFIX.length));
  deps.log('GOOGLE_LINKED_TO_EMAIL_ACCOUNT', { username: target });
  return event;
}

/** Decides what happens next: one custom challenge, then tokens if it was answered correctly, otherwise fail. */
export function defineChallenge(event: any): any {
  const session: any[] = event.request?.session ?? [];
  const r = event.response;
  r.issueTokens = false; r.failAuthentication = false;
  if (event.request?.userNotFound) { r.failAuthentication = true; return event; }
  if (session.some(s => s.challengeName !== 'CUSTOM_CHALLENGE')) { r.failAuthentication = true; return event; }
  if (session.length === 0) { r.challengeName = 'CUSTOM_CHALLENGE'; return event; }
  const last = session[session.length - 1];
  if (last.challengeResult === true) r.issueTokens = true;
  else r.failAuthentication = true;                      // one attempt only: a wrong answer ends the sign-in
  return event;
}

export function createChallenge(event: any): any {
  if (event.request?.challengeName === 'CUSTOM_CHALLENGE') {
    event.response.publicChallengeParameters = { type: 'APPLE' };
    event.response.privateChallengeParameters = {};
    event.response.challengeMetadata = 'APPLE';
  }
  return event;
}

export async function verifyChallenge(event: any, deps: TriggerDeps): Promise<any> {
  event.response.answerCorrect = false;
  try {
    const answer = JSON.parse(event.request?.challengeAnswer ?? '{}');
    const claims = await check(answer.identityToken, answer.nonce, deps);
    const attrs = event.request?.userAttributes ?? {};
    if (!lower(attrs.email) || lower(attrs.email) !== lower(claims.email)) throw new Error('Email does not match the Apple account.');

    const nonceHash = createHash('sha256').update(String(answer.nonce)).digest('hex');
    if (!(await deps.claimNonce(nonceHash))) throw new Error('This Apple sign-in was already used.');

    event.response.answerCorrect = true;

    // Sign-in is allowed from here. Keeping Apple's refresh token is best effort: if it fails we log it (an alarm
    // watches for it) rather than block the user.
    if (answer.authorizationCode) {
      try {
        const refreshToken = await deps.exchangeCode(String(answer.authorizationCode), claims.aud);
        await deps.saveToken({ userSub: attrs.sub, appleSub: claims.sub, clientId: claims.aud, refreshToken });
      } catch (e: any) {
        deps.log('APPLE_TOKEN_STORE_FAILED', e?.message);
      }
    }
  } catch (e: any) {
    deps.log('APPLE_SIGNIN_REJECTED', e?.message);
    event.response.answerCorrect = false;
  }
  return event;
}
