// Connects the trigger rules to the real services (Apple, DynamoDB). Used by the four trigger handlers.
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityProviderClient, ListUsersCommand, AdminLinkProviderForUserCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { randomBytes } from 'crypto';
import { fetchAppleKeys, buildClientSecret, exchangeAuthorizationCode, type Jwk } from './apple';
import type { TriggerDeps } from './triggers';

export const APPLE_TEAM_ID = 'R9B6UZYCN9';
export const APPLE_KEY_ID = 'LPDB84NQ5U';

const dynamo = new DynamoDBClient({});
const cognito = new CognitoIdentityProviderClient({});
const TABLE = () => process.env.APPLE_TABLE_NAME!;

let keyCache: { keys: Jwk[]; at: number } | null = null;

export const privateKeyPem = () => Buffer.from(process.env.APPLE_PRIVATE_KEY_B64 ?? '', 'base64').toString('utf8');

export function makeDeps(): TriggerDeps {
  return {
    audiences: (process.env.APPLE_BUNDLE_IDS ?? '').split(',').map((s: string) => s.trim()).filter(Boolean),
    loadKeys: async () => {
      if (keyCache && Date.now() - keyCache.at < 60 * 60 * 1000) return keyCache.keys;
      const keys = await fetchAppleKeys(fetch as any);
      keyCache = { keys, at: Date.now() };
      return keys;
    },
    claimNonce: async (hash) => {
      try {
        await dynamo.send(new PutItemCommand({
          TableName: TABLE(),
          Item: { pk: { S: `NONCE#${hash}` }, ttl: { N: String(Math.floor(Date.now() / 1000) + 900) } },
          ConditionExpression: 'attribute_not_exists(pk)',
        }));
        return true;
      } catch (e: any) {
        if (e?.name === 'ConditionalCheckFailedException') return false;
        throw e;
      }
    },
    exchangeCode: async (code, clientId) => {
      const clientSecret = buildClientSecret({ teamId: APPLE_TEAM_ID, keyId: APPLE_KEY_ID, clientId, privateKeyPem: privateKeyPem() });
      return (await exchangeAuthorizationCode(fetch as any, { code, clientId, clientSecret })).refreshToken;
    },
    saveToken: async ({ userSub, appleSub, clientId, refreshToken }) => {
      await dynamo.send(new PutItemCommand({
        TableName: TABLE(),
        Item: {
          pk: { S: `USER#${userSub}` }, appleSub: { S: appleSub }, clientId: { S: clientId },
          refreshToken: { S: refreshToken }, updatedAt: { S: new Date().toISOString() },
        },
      }));
    },
    // Cognito's email filter is an exact, case-sensitive match, so look up the address as given and in lower case. Quotes and backslashes cannot appear in a real address and would break the filter.
    findUsersByEmail: async (poolId, email) => {
      if (/["\\]/.test(email)) return [];
      const variants = Array.from(new Set([email, email.toLowerCase()]));
      const found = new Map<string, { username: string; status: string; emailVerified: boolean }>();
      for (const v of variants) {
        const res = await cognito.send(new ListUsersCommand({ UserPoolId: poolId, Filter: `email = "${v}"`, Limit: 10 }));
        for (const u of res.Users ?? []) {
          const verified = (u.Attributes ?? []).find(a => a.Name === 'email_verified')?.Value === 'true';
          found.set(u.Username!, { username: u.Username!, status: u.UserStatus ?? '', emailVerified: verified });
        }
      }
      return Array.from(found.values());
    },
    linkGoogle: async (poolId, existingUsername, googleSub) => {
      await cognito.send(new AdminLinkProviderForUserCommand({
        UserPoolId: poolId,
        DestinationUser: { ProviderName: 'Cognito', ProviderAttributeValue: existingUsername },
        SourceUser: { ProviderName: 'Google', ProviderAttributeName: 'Cognito_Subject', ProviderAttributeValue: googleSub },
      }));
    },
    createVerifiedUser: async (poolId, email) => {
      const created = await cognito.send(new AdminCreateUserCommand({
        UserPoolId: poolId, Username: email, MessageAction: 'SUPPRESS',
        UserAttributes: [{ Name: 'email', Value: email }, { Name: 'email_verified', Value: 'true' }],
      }));
      const username = created.User!.Username!;
      // A random password nobody sees makes the account CONFIRMED; the person signs in with Google or Apple, or
      // sets their own password through "forgot password".
      await cognito.send(new AdminSetUserPasswordCommand({
        UserPoolId: poolId, Username: username, Permanent: true, Password: `Aa1!${randomBytes(24).toString('hex')}`,
      }));
      return username;
    },
    log: (message, extra) => console.error(message, extra ?? ''),
  };
}
