import { signPass } from '../car-progress/pass';

// The caller is the verified signed-in user (event.identity); nothing in the request is trusted. The pass records
// the same "owner" value the data layer stores on this user's rows, so rows written later stay readable by them.
export const handler = async (event: any): Promise<string> => {
  const sub = event.identity?.sub;
  const username = event.identity?.username;
  const secret = process.env.CAR_PASS_SECRET;
  if (!sub || !username) throw new Error('Not authorized');
  if (!secret) throw new Error('Car pass is not configured');
  return JSON.stringify(signPass({ userId: sub, owner: `${sub}::${username}` }, secret, Date.now()));
};
