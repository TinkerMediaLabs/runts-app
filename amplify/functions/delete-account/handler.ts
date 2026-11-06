import { DynamoDBClient, DeleteItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { deleteAccount } from './core';
import { buildClientSecret, revokeRefreshToken } from '../apple-auth/apple';
import { APPLE_KEY_ID, APPLE_TEAM_ID, privateKeyPem } from '../apple-auth/wiring';

// Deletes the CALLING user's own account: profile data first, then the sign-in account. Nothing in the request
// is trusted; the user comes from the verified sign-in (event.identity), so nobody can delete anyone else.
// Replaces the hand-built delete-user API, so it works the same in every environment.
const dynamo = new DynamoDBClient({});
const cognito = new CognitoIdentityProviderClient({});
const USER_TABLE = process.env.USER_TABLE_NAME!;
const USER_POOL_ID = process.env.USER_POOL_ID!;
const APPLE_TABLE = process.env.APPLE_TABLE_NAME!;

// Revokes the Apple refresh token kept at sign-in, then forgets it. Safe to repeat. Apple answering "invalid"
// (400) means the token is already gone, which is the outcome we want.
async function revokeAppleToken(userId: string) {
  const key = { pk: { S: `USER#${userId}` } };
  const row = (await dynamo.send(new GetItemCommand({ TableName: APPLE_TABLE, Key: key }))).Item;
  if (!row?.refreshToken?.S) return;
  const clientId = row.clientId.S!;
  const clientSecret = buildClientSecret({ teamId: APPLE_TEAM_ID, keyId: APPLE_KEY_ID, clientId, privateKeyPem: privateKeyPem() });
  try {
    await revokeRefreshToken(fetch as any, { token: row.refreshToken.S, clientId, clientSecret });
  } catch (e: any) {
    if (!/\(400\)/.test(String(e?.message))) throw e;
  }
  await dynamo.send(new DeleteItemCommand({ TableName: APPLE_TABLE, Key: key }));
}

export const handler = async (event: any): Promise<boolean> => {
  return deleteAccount(event.identity, {
    revokeAppleToken,
    deleteProfileRow: async (userId) => {
      await dynamo.send(new DeleteItemCommand({ TableName: USER_TABLE, Key: { id: { S: userId } } }));
    },
    deleteSignInAccount: async (username) => {
      try {
        await cognito.send(new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: username }));
      } catch (e: any) {
        if (e?.name !== 'UserNotFoundException') throw e;   // already gone: a retry after a partial failure
      }
    },
  });
};
