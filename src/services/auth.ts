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
} from 'aws-amplify/auth';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

// ─── GOOGLE SIGN IN ──────────────────────────────────────────────────────────
export async function signInWithGoogle() {
  await signInWithRedirect({ provider: 'Google' });
}

// ─── APPLE SIGN IN ───────────────────────────────────────────────────────────
export async function signInWithApple() {
  await signInWithRedirect({ provider: 'Apple' });
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
    // No existing session, proceed normally
  }
  return signIn({ username: email, password });
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
  const blob = await response.blob();

  // Get the Identity Pool identity ID (not the User Pool sub)
  const session = await fetchAuthSession();
  const identityId = session.identityId;

  await uploadData({
    path: `profile-pictures/${identityId}/avatar.jpg`,
    data: blob,
    options: {
      contentType: mimeType,
    },
  }).result;

  const { url } = await getUrl({
    path: `profile-pictures/${identityId}/avatar.jpg`,
    options: { expiresIn: 3600 * 24 * 7 },
  });

  return url.toString();
}

// ─── GET OR CREATE USER IN DYNAMODB ─────────────────────
export async function getOrCreateUser() {
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

  const { data: newUser } = await client.models.User.create({
    id: userId,
    type: 'user',
    name,
    profilePicUri,
    birthdate: null,
    isPublisher: false,
    plan: 'free',
    onboardingComplete: false,
  });

  return newUser;
}