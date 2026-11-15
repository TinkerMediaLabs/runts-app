import { Amplify } from 'aws-amplify';
import { useSyncExternalStore } from 'react';

// Which kind of access the app's data calls use right now. Signed-in users use their account; guests (not signed in)
// use the identity pool's anonymous access, which the backend limits to the public catalog. The app has many data
// calls and each one resolves its access mode when the request is made, so flipping this one setting switches them all.
let baseConfig: any = null;
let current: 'user' | 'guest' = 'user';
const listeners = new Set<() => void>();

export function registerBaseConfig(config: any) {
  baseConfig = config;
}

export function setDataAccess(mode: 'user' | 'guest') {
  if (!baseConfig || mode === current) return;
  current = mode;
  listeners.forEach(l => l());
  Amplify.configure({
    ...baseConfig,
    data: { ...baseConfig.data, default_authorization_type: mode === 'guest' ? 'AWS_IAM' : 'AMAZON_COGNITO_USER_POOLS' },
  });
}

export const getDataAccess = () => current;

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** True while the app is browsing as a guest. Flips the moment guest mode starts or ends (before the screen re-renders). */
export function useIsGuest(): boolean {
  return useSyncExternalStore(subscribe, () => current === 'guest');
}
