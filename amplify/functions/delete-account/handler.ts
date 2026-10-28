import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { deleteAccount } from './core';

// Deletes the CALLING user's own account: profile data first, then the sign-in account. Nothing in the request
// is trusted; the user comes from the verified sign-in (event.identity), so nobody can delete anyone else.
// Replaces the hand-built delete-user API, so it works the same in every environment.
const dynamo = new DynamoDBClient({});
const cognito = new CognitoIdentityProviderClient({});
const USER_TABLE = process.env.USER_TABLE_NAME!;
const USER_POOL_ID = process.env.USER_POOL_ID!;

export const handler = async (event: any): Promise<boolean> => {
  return deleteAccount(event.identity, {
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
