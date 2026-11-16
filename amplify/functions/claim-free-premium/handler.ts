import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { claimFreePremium, type ClaimResult } from './core';

// The signed-in person claims their own 3 free months of Premium. Nothing in the request is trusted: the person
// comes from the verified sign-in (event.identity), so nobody can claim for someone else. Premium is granted as
// a RevenueCat promotional entitlement (no store, no payment method, no renewal). The RevenueCat app user id is
// the Cognito sub, the same id the app signs in to RevenueCat with.
const dynamo = new DynamoDBClient({});
const CLAIM_TABLE = process.env.CLAIM_TABLE_NAME!;
const SETTING_TABLE = process.env.SETTING_TABLE_NAME!;
const RC_KEY = process.env.REVENUECAT_SECRET_KEY!;
const ENTITLEMENT = 'premium';

export const handler = async (event: any): Promise<ClaimResult> => {
  return claimFreePremium(event.identity, {
    offerEnd: async () => {
      const row = await dynamo.send(new GetItemCommand({ TableName: SETTING_TABLE, Key: { id: { S: 'premiumFreeUntil' } } }));
      return row.Item?.value?.S ?? null;
    },
    markClaimed: async (userId, atIso) => {
      try {
        await dynamo.send(new PutItemCommand({
          TableName: CLAIM_TABLE,
          Item: { id: { S: userId }, claimedAt: { S: atIso } },
          ConditionExpression: 'attribute_not_exists(id)',
        }));
        return true;
      } catch (e: any) {
        if (e?.name === 'ConditionalCheckFailedException') return false;
        throw e;
      }
    },
    unmarkClaimed: async (userId) => {
      await dynamo.send(new DeleteItemCommand({ TableName: CLAIM_TABLE, Key: { id: { S: userId } } }));
    },
    grant: async (userId, endMs) => {
      const res = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}/entitlements/${ENTITLEMENT}/promotional`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${RC_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ end_time_ms: endMs }),
        },
      );
      if (!res.ok) throw new Error(`RevenueCat grant failed (${res.status})`);
    },
  });
};
