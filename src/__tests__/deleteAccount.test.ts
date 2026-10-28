import { deleteAccount } from '../../amplify/functions/delete-account/core';

const make = () => {
  const calls: string[] = [];
  const deps = {
    deleteProfileRow: jest.fn(async (id: string) => { calls.push(`row:${id}`); }),
    deleteSignInAccount: jest.fn(async (u: string) => { calls.push(`account:${u}`); }),
  };
  return { calls, deps };
};

describe('deleteAccount', () => {
  it('removes the profile data first, then the sign-in account', async () => {
    const { calls, deps } = make();
    await expect(deleteAccount({ sub: 'u1', username: 'google_123' }, deps)).resolves.toBe(true);
    expect(calls).toEqual(['row:u1', 'account:google_123']);
  });

  it('refuses without a signed-in identity and touches nothing', async () => {
    for (const identity of [null, undefined, {}, { sub: 'u1' }, { username: 'x' }]) {
      const { deps } = make();
      await expect(deleteAccount(identity as any, deps)).rejects.toThrow('Not signed in.');
      expect(deps.deleteProfileRow).not.toHaveBeenCalled();
      expect(deps.deleteSignInAccount).not.toHaveBeenCalled();
    }
  });

  it('does not remove the sign-in account when the data step fails', async () => {
    const { deps } = make();
    deps.deleteProfileRow.mockRejectedValueOnce(new Error('dynamo down'));
    await expect(deleteAccount({ sub: 'u1', username: 'a' }, deps)).rejects.toThrow('dynamo down');
    expect(deps.deleteSignInAccount).not.toHaveBeenCalled();
  });

  it('can be retried after the account step fails', async () => {
    const { calls, deps } = make();
    deps.deleteSignInAccount.mockRejectedValueOnce(new Error('cognito down'));
    const identity = { sub: 'u1', username: 'a' };
    await expect(deleteAccount(identity, deps)).rejects.toThrow('cognito down');
    await expect(deleteAccount(identity, deps)).resolves.toBe(true);
    expect(calls).toEqual(['row:u1', 'row:u1', 'account:a']);
  });
});
