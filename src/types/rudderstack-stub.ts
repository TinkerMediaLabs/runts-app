// Local stub for @rudderstack/rudder-sdk-react-native.
//
// The real package ships raw, uncompiled TypeScript source with internal
// type errors (missing @types/async-lock, implicit-any params) and overload
// signatures that don't match this app's actual usage. Redirecting the
// import here (via tsconfig "paths") stops TypeScript from ever loading
// the real package's source for type-checking, while still providing
// accurate types for how we actually call it. This has no effect on the
// runtime bundle — Metro/Babel still resolve the real package normally.

interface RudderClient {
  setup: (writeKey: string, options?: Record<string, unknown>) => Promise<void>;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  reset: () => void;
  track: (event: string, properties?: object) => void;
}

declare const rudderClient: RudderClient;

export default rudderClient;