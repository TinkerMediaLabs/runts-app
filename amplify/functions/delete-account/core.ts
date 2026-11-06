// The account-deletion steps, with the AWS calls passed in so the order and the retry behaviour can be tested.
//
// Order matters:
//   0. If the user signed in with Apple, revoke their Apple token first (Apple requires it). If Apple cannot be reached
//      we stop here with nothing deleted, so the person can simply try again.
//   1. Remove the user's profile row. That fires the user-cleanup stream, which deletes everything the
//      user owned (comments, ratings, favorites, ...).
//   2. Remove the sign-in account.
// Both steps are safe to repeat. If step 2 fails, the caller gets an error and still has a working sign-in, so
// they can simply try again; step 1 is then a no-op and step 2 finishes the job.
export type Deps = {
  revokeAppleToken: (userId: string) => Promise<void>;     // no-op when the user has no stored Apple token
  deleteProfileRow: (userId: string) => Promise<void>;
  deleteSignInAccount: (username: string) => Promise<void>;   // must ignore "user not found"
};

export type Identity = { sub?: string; username?: string } | null | undefined;

export async function deleteAccount(identity: Identity, deps: Deps): Promise<boolean> {
  const userId = identity?.sub;
  const username = identity?.username;
  if (!userId || !username) throw new Error('Not signed in.');
  await deps.revokeAppleToken(userId);
  await deps.deleteProfileRow(userId);
  await deps.deleteSignInAccount(username);
  return true;
}
