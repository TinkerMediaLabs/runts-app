// Amplify Data returns validation, authorization and conditional-write failures in `res.errors`
// instead of throwing. A caller that ignores `errors` reports success while nothing was saved
// (this is how bookmarks silently failed). Wrap every create / update / delete in one of these.

type AmplifyResult<T> = { data?: T | null; errors?: readonly { message: string }[] | null };

// Throws when the write was rejected. Use where the caller can surface or handle the failure
// (mutations, form submits).
export function unwrap<T>(res: AmplifyResult<T>, action = 'Request'): T | null {
  if (res.errors && res.errors.length > 0) {
    throw new Error(`${action} failed: ${res.errors[0].message}`);
  }
  return (res.data ?? null) as T | null;
}

// Logs a rejected write and carries on. Use for best-effort background cleanup where a failure must
// not interrupt what the user is doing (e.g. tidying pins after a story finishes).
export function warnOnErrors<T>(res: AmplifyResult<T>, action = 'Request'): T | null {
  if (res.errors && res.errors.length > 0) {
    console.warn(`${action} was rejected:`, res.errors[0].message);
  }
  return (res.data ?? null) as T | null;
}
