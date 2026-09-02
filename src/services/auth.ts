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

// ─── APPLE SIGN IN ───────────────────────────────────────────────────────────
export async function signInWithApple() {
  try {
    await getCurrentUser();
    await signOut();
  } catch {
    // No existing session
  }
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