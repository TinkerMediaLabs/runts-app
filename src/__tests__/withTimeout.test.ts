import { withTimeout } from '../lib/withTimeout';

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the value when the promise resolves in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000, 'fallback')).resolves.toBe('ok');
  });

  it('returns the fallback when the promise rejects', async () => {
    await expect(withTimeout(Promise.reject(new Error('offline')), 1000, 'fallback')).resolves.toBe('fallback');
  });

  it('returns the fallback when the promise is too slow', async () => {
    const never = new Promise<string>(() => {});
    const result = withTimeout(never, 1000, 'fallback');
    jest.advanceTimersByTime(1000);
    await expect(result).resolves.toBe('fallback');
  });
});
