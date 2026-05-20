import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchUserAttributes,
} from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

const client = generateClient<Schema>();

// ─── GOOGLE SIGN IN ──────────────────────────────────────────────────────────
export async function signInWithGoogle() {
  const redirectUrl = AuthSession.makeRedirectUri({
    scheme: 'runts',
    path: 'callback',
  });

  const result = await WebBrowser.openAuthSessionAsync(
    `https://runts-auth-dev.auth.us-east-2.amazoncognito.com/oauth2/authorize?` +
    `identity_provider=Google&` +
    `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
    `response_type=code&` +
    `client_id=4uv0130mglneuvo936bepvqr74&` +
    `scope=email+openid+profile`,
    redirectUrl
  );

  if (result.type === 'success' && result.url) {
    // Extract the authorization code from the redirect URL
    const url = new URL(result.url);
    const code = url.searchParams.get('code');

    if (code) {
      // Exchange the code for tokens via Cognito token endpoint
      const tokenResponse = await fetch(
        `https://runts-auth-dev.auth.us-east-2.amazoncognito.com/oauth2/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: '4uv0130mglneuvo936bepvqr74',
            code,
            redirect_uri: redirectUrl,
          }).toString(),
        }
      );

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        throw new Error(tokens.error_description || 'Token exchange failed');
      }

      // Sign in to Amplify using the identity token
      await signIn({
        username: 'oauth_google',
        options: {
          authFlowType: 'CUSTOM_WITHOUT_SRP',
        },
      });
    }
  }
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

// ─── GET OR CREATE USER IN DYNAMODB ─────────────────────
export async function getOrCreateUser() {
  const { userId } = await getCurrentUser();

  const { data: existing } = await client.models.User.get({ id: userId });

  if (existing) return existing;

  const { data: newUser } = await client.models.User.create({
    id: userId,
    type: 'user',
    name: null,
    isPublisher: false,
    plan: 'free',
  });

  return newUser;
}