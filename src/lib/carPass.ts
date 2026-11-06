import { Platform } from 'react-native';
import TrackPlayer from '@rntp/player';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { CAR_PROGRESS_URL } from './amplifyConfig';

// While a story plays from the car with the app closed, the player library posts listening progress to the
// backend on its own. It cannot sign in, so it carries a "car pass" (30 days, progress only) that we hand it
// here whenever the app is open and signed in.
export const carPassEnabled = Platform.OS === 'android' && !!CAR_PROGRESS_URL;

export async function refreshCarPass(): Promise<void> {
  if (!carPassEnabled) return;
  const client = generateClient<Schema>();
  const { data, errors } = await client.mutations.getCarPass();
  if (errors?.length || !data) throw new Error(errors?.[0]?.message ?? 'Could not get a car pass');
  const { pass } = JSON.parse(data) as { pass: string; expiresAt: string };
  TrackPlayer.updateProgressSyncHeaders({ Authorization: `Bearer ${pass}` });
}

/** On sign-out: the library keeps posting, but without a valid pass the backend refuses it. */
export function clearCarPass(): void {
  if (!carPassEnabled) return;
  try { TrackPlayer.updateProgressSyncHeaders({ Authorization: 'Bearer signed-out' }); } catch {}
}
