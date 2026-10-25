import { clearDownloadProgress, getDownloadProgress, setDownloadProgress, subscribeDownloadProgress } from '../lib/downloadProgress';

describe('downloadProgress', () => {
  afterEach(() => clearDownloadProgress('s1'));

  it('clamps to 0..1', () => {
    setDownloadProgress('s1', 1.7);
    expect(getDownloadProgress('s1')).toBe(1);
    setDownloadProgress('s1', -3);
    expect(getDownloadProgress('s1')).toBe(0);
  });

  it('only notifies when the whole percent changes', () => {
    const listener = jest.fn();
    const unsub = subscribeDownloadProgress(listener);
    setDownloadProgress('s1', 0.101);
    setDownloadProgress('s1', 0.105);
    setDownloadProgress('s1', 0.11);
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
  });

  it('forgets a story when cleared', () => {
    setDownloadProgress('s1', 0.5);
    clearDownloadProgress('s1');
    expect(getDownloadProgress('s1')).toBeUndefined();
  });
});
