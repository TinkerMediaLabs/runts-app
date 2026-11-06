// Small pure helpers for native Sign in with Apple (the sign-in call itself lives in services/auth.ts).

/** Reads the claims from an Apple identity token. Only for deciding which email to use; the server verifies the token. */
export function decodeAppleClaims(token: string): { sub?: string; email?: string } {
  try {
    const part = token.split('.')[1] ?? '';
    const json = decodeURIComponent(
      atob(part.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const p = JSON.parse(json);
    return { sub: p.sub, email: typeof p.email === 'string' ? p.email : undefined };
  } catch {
    return {};
  }
}

const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

/** One-time nonce for a single Apple sign-in attempt. */
export const makeNonce = (bytes: Uint8Array) => hex(bytes);

/** Cognito needs a password to create the user; Apple users never use it, so it is random and thrown away.
 *  The fixed prefix just satisfies the pool's upper/lower/number/symbol rule. */
export const makeThrowawayPassword = (bytes: Uint8Array) => `Aa1!${hex(bytes)}`;

/** The name Apple gives only the first time, as "Given Family", or undefined. */
export function fullNameOf(n?: { givenName?: string | null; familyName?: string | null } | null): string | undefined {
  const s = [n?.givenName, n?.familyName].filter(Boolean).join(' ').trim();
  return s || undefined;
}

/** Turns the raw error from the sign-in triggers into something a person can act on. */
export function friendlyAppleError(e: any): string {
  const m = String(e?.message ?? '');
  if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') return '';   // person closed the Apple sheet
  if (/Email does not match|not verified/i.test(m)) return 'We could not match your Apple email to an account. Try another sign-in method.';
  if (/already used with Google/i.test(m)) return 'This email already has a Google account. Continue with Google to sign in.';
  if (/already used|Nonce/i.test(m)) return 'That sign-in expired. Please try again.';
  return 'Could not sign in with Apple. Please try again.';
}
