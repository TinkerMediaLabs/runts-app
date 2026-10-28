import {
  signIn,
  signOut,
  signUp,
  signInWithRedirect,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
  confirmSignIn,
} from 'aws-amplify/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { rememberSignInMethod } from '../lib/signInMethod';
import { decodeAppleClaims, makeNonce, makeThrowawayPassword, fullNameOf } from '../lib/appleSignIn';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';


// ─── GOOGLE SIGN IN ──────────────────────────────────────────────────────────
export async function signInWithGoogle() {
  try {
    await getCurrentUser();
    await signOut();
  } catch {
    // No existing session
  }
  await signInWithRedirect({ provider: 'Google' });
}

// ─── APPLE SIGN IN (native, iOS) ─────────────────────────────────────────────
// Shows the Apple sheet, then signs the person in through our custom Cognito flow. The server checks Apple's
// token and keeps Apple's refresh token so it can be revoked when the account is deleted.
export async function signInWithApple() {
  try {
    await getCurrentUser();
    await signOut();
  } catch {
    // No existing session
  }

  const nonce = makeNonce(await Crypto.getRandomBytesAsync(16));
  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce,
  });
  if (!cred.identityToken || !cred.authorizationCode) throw new Error('Apple did not return a sign-in token.');

  const email = decodeAppleClaims(cred.identityToken).email;
  if (!email) throw new Error('Apple did not share an email address.');
  const name = fullNameOf(cred.fullName);

  // First time: create the user (the server confirms it after checking the Apple token). Already exists: carry on.
  try {
    await signUp({
      username: email,
      password: makeThrowawayPassword(await Crypto.getRandomBytesAsync(16)),
      options: {
        userAttributes: { email, ...(name ? { name } : {}) },
        clientMetadata: { appleIdentityToken: cred.identityToken, appleNonce: nonce },
      },
    });
  } catch (e: any) {
    if (e?.name !== 'UsernameExistsException') throw e;
  }

  const step = await signIn({ username: email, options: { authFlowType: 'CUSTOM_WITHOUT_SRP' } });
  if (step.nextStep?.signInStep !== 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
    throw new Error('Unexpected sign-in step.');
  }
  const done = await confirmSignIn({
    challengeResponse: JSON.stringify({ identityToken: cred.identityToken, authorizationCode: cred.authorizationCode, nonce }),
  });
  if (!done.isSignedIn) throw new Error('Apple sign-in was not completed.');
  await rememberSignInMethod('apple');
}

// ─── SIGN UP ────────────────────────────────────────────
export async function registerUser(email: string, password: string) {
  return signUp({
    username: email,
    password,
    options: { userAttributes: { email } },
  });
}

// ─── CONFIRM EMAIL ──────────────────────────────────────
export async function confirmUserEmail(email: string, code: string) {
  return confirmSignUp({ username: email, confirmationCode: code });
}

// ─── RESEND CODE ────────────────────────────────────────
export async function resendCode(email: string) {
  return resendSignUpCode({ username: email });
}

// ─── SIGN IN ────────────────────────────────────────────
export async function loginUser(email: string, password: string) {
    try {
        await getCurrentUser();
        await signOut();
    } catch {
        // No existing session
    }
    
    const result = await signIn({ username: email, password });
    console.log('[loginUser] nextStep:', result.nextStep?.signInStep, 'isSignedIn:', result.isSignedIn);
    
    // Only throw if sign-in failed AND next step is CONFIRM_SIGN_UP
    if (!result.isSignedIn && result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        const error = new Error('User is not confirmed.');
        (error as any).name = 'UserNotConfirmedException';
        throw error;
    }
    
    if (result.isSignedIn) await rememberSignInMethod('email');
    return result;
}

// ─── SIGN OUT ───────────────────────────────────────────
export async function logoutUser() {
  return signOut();
}

// ─── FORGOT PASSWORD ────────────────────────────────────
export async function sendPasswordResetCode(email: string) {
  return resetPassword({ username: email });
}

// ─── CONFIRM NEW PASSWORD ───────────────────────────────
export async function confirmNewPassword(
  email: string,
  code: string,
  newPassword: string
) {
  return confirmResetPassword({
    username: email,
    confirmationCode: code,
    newPassword,
  });
}

// Cache for story image URLs to avoid regenerating on every render
const imageUrlCache: Record<string, { url: string; expiresAt: number }> = {};

export async function getStoryImageUrl(path: string): Promise<string> {
  if (!path) return '';
  
  // Return cached URL if still valid (expires in 6 days, refresh at 1 day remaining)
  const cached = imageUrlCache[path];
  if (cached && cached.expiresAt > Date.now() + 1000 * 60 * 60 * 24) {
    return cached.url;
  }

  const { url } = await getUrl({
    path,
    options: { expiresIn: 3600 * 24 * 7 }, // 7 days
  });

  const urlString = url.toString();
  imageUrlCache[path] = {
    url: urlString,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };

  return urlString;
}

export async function getAuthorImageUrl(path: string): Promise<string> {
  if (!path) return '';

  const cached = imageUrlCache[path];
  if (cached && cached.expiresAt > Date.now() + 1000 * 60 * 60 * 24) {
    return cached.url;
  }
  const { url } = await getUrl({
    path,
    options: { expiresIn: 3600 * 24 * 7 }, // 7 days
  });
  const urlString = url.toString();
  imageUrlCache[path] = {
    url: urlString,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  return urlString;
}

// ─── UPLOAD PROFILE PICTURE TO S3 ───────────────────────────────────────────
export async function getProfilePicUrl(path: string): Promise<string> {
  const { url } = await getUrl({
    path,
    options: { expiresIn: 3600 * 24 * 7 },
  });
  return url.toString();
}

export async function uploadProfilePicture(
  userId: string,
  imageUri: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  const response = await fetch(imageUri);
  const blob     = await response.blob();

  const session    = await fetchAuthSession();
  const identityId = session.identityId;
  const s3Path     = `profile-pictures/${identityId}/avatar.jpg`;

  await uploadData({
    path:    s3Path,
    data:    blob,
    options: { contentType: mimeType },
  }).result;

  return s3Path; // ← return path, not signed URL
}

// ─── GET OR CREATE USER IN DYNAMODB ─────────────────────
export async function getOrCreateUser() {

  const client = generateClient<Schema>();
  const { userId } = await getCurrentUser();

  const { data: existing } = await client.models.User.get({ id: userId });

  if (existing) return existing;

  // Try to get name and profile pic from social provider token
  let profilePicUri: string | null = null;
  let name: string | null = null;

  try {
    const session = await fetchAuthSession();
    const payload = session.tokens?.idToken?.payload as any;
    const identities = payload?.identities;

    if (identities && Array.isArray(identities) && identities.length > 0) {
      // Google provides name and picture in the token
      profilePicUri = payload?.picture ?? null;
      name = payload?.name ?? null;

      // Apple may provide name on first sign in only
      if (!name && payload?.given_name) {
        name = [payload.given_name, payload.family_name].filter(Boolean).join(' ');
      }
    }
  } catch {
    // Not a social user or no data available
  }

  const { data: newUser, errors: createErrors } = await client.models.User.create({
    id: userId,
    type: 'user',
    name,
    profilePicUri,
    birthdate: null,
    isPublisher: false,
    plan: 'free',
    onboardingComplete: false,
  });

  if (createErrors?.length) {
    console.warn('Creating the User row was rejected:', createErrors[0].message);
  }
  return newUser;
}