// Resolves with the promise's value, or with the fallback if it rejects or takes longer than ms.
// Used so optional network steps (saved position, queue lookup) can never block playback offline.
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>(resolve => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      () => { clearTimeout(timer); resolve(fallback); },
    );
  });
}
