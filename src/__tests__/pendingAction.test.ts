import { setPendingAction, takePendingAction, clearPendingAction, hasPendingAction, PENDING_MINUTES } from '../lib/pendingAction';

const T = 1_000_000_000_000;
beforeEach(() => clearPendingAction());

describe('pending action', () => {
  it('is handed back once, then forgotten', () => {
    setPendingAction({ kind: 'pin', id: 's1' }, T);
    expect(hasPendingAction(T + 1000)).toBe(true);
    expect(takePendingAction(T + 1000)).toEqual({ kind: 'pin', id: 's1' });
    expect(takePendingAction(T + 1000)).toBeNull();
    expect(hasPendingAction(T + 1000)).toBe(false);
  });
  it('keeps only the latest action', () => {
    setPendingAction({ kind: 'pin', id: 's1' }, T);
    setPendingAction({ kind: 'follow', id: 'a1' }, T + 10);
    expect(takePendingAction(T + 20)).toEqual({ kind: 'follow', id: 'a1' });
  });
  it('drops an action that is too old', () => {
    setPendingAction({ kind: 'story', id: 's1' }, T);
    expect(takePendingAction(T + (PENDING_MINUTES + 1) * 60 * 1000)).toBeNull();
  });
  it('clears when set with nothing (a prompt that has no replayable action)', () => {
    setPendingAction({ kind: 'story', id: 's1' }, T);
    setPendingAction(undefined, T + 5);
    expect(takePendingAction(T + 10)).toBeNull();
  });
  it('keeps the genre to follow and its name', () => {
    setPendingAction({ kind: 'followTag', id: 't1', name: 'Mystery' }, T);
    expect(takePendingAction(T + 1000)).toEqual({ kind: 'followTag', id: 't1', name: 'Mystery' });
  });
  it('is empty by default', () => { expect(takePendingAction(T)).toBeNull(); });
});
