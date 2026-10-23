import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Account-level PIN that locks erotic content (e.g. a parent sharing an account with a child).
// The PIN hash lives in its own table that ONLY this function can read; the app never sees it, so
// it cannot be copied off the phone and brute forced. Wrong guesses are counted on the server:
// MAX_ATTEMPTS misses lock the PIN for LOCK_SECONDS, whatever device the guesses come from.
//
// One entry point, four actions (all for the signed-in caller only, from event.identity):
//   status  -> { pinSet }
//   verify  -> pin
//   set     -> newPin (+ pin when one is already set)
//   remove  -> pin
const dynamo = new DynamoDBClient({});

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;
const PIN_PATTERN = /^\d{4}$/;

type Result = {
  ok: boolean;
  pinSet: boolean;
  error?: string;            // 'wrong_pin' | 'locked' | 'invalid_pin' | 'pin_required' | 'bad_request' | 'server_error'
  attemptsLeft?: number;
  lockedUntil?: number;      // epoch seconds
};

const hashPin = (pin: string, salt: Buffer) => scryptSync(pin, salt, 64);

export const handler = async (event: any): Promise<Result> => {
  const userId: string | undefined = event.identity?.sub ?? event.identity?.username;
  const action: string = event.arguments?.action;
  const pin: string | undefined = event.arguments?.pin ?? undefined;
  const newPin: string | undefined = event.arguments?.newPin ?? undefined;
  const table = process.env.EROTIC_PIN_TABLE_NAME;

  if (!userId || !table) {
    console.error('erotic-pin: missing identity or EROTIC_PIN_TABLE_NAME');
    return { ok: false, pinSet: false, error: 'server_error' };
  }

  try {
    const got = await dynamo.send(new GetItemCommand({
      TableName: table,
      Key: { id: { S: userId } },
      ConsistentRead: true,
    }));
    const item = got.Item;
    const pinSet = !!item?.hash?.S;
    const now = Math.floor(Date.now() / 1000);

    if (action === 'status') return { ok: true, pinSet };

    // Verify the current PIN (counts wrong guesses). Used by verify / remove / set-when-set.
    const checkCurrent = async (): Promise<Result | null> => {
      const lockedUntil = Number(item?.lockedUntil?.N ?? 0);
      if (lockedUntil > now) return { ok: false, pinSet, error: 'locked', lockedUntil };
      if (!pin || !PIN_PATTERN.test(pin)) return { ok: false, pinSet, error: 'pin_required' };

      const salt = Buffer.from(item!.salt!.S!, 'base64');
      const expected = Buffer.from(item!.hash!.S!, 'base64');
      if (timingSafeEqual(hashPin(pin, salt), expected)) {
        if (Number(item?.failedAttempts?.N ?? 0) > 0) {
          await dynamo.send(new UpdateItemCommand({
            TableName: table,
            Key: { id: { S: userId } },
            UpdateExpression: 'SET failedAttempts = :z',
            ExpressionAttributeValues: { ':z': { N: '0' } },
          }));
        }
        return null;   // correct
      }

      // Wrong PIN: count it atomically; lock after MAX_ATTEMPTS.
      const upd = await dynamo.send(new UpdateItemCommand({
        TableName: table,
        Key: { id: { S: userId } },
        UpdateExpression: 'ADD failedAttempts :one',
        ExpressionAttributeValues: { ':one': { N: '1' } },
        ReturnValues: 'UPDATED_NEW',
      }));
      const failed = Number(upd.Attributes?.failedAttempts?.N ?? 1);
      if (failed >= MAX_ATTEMPTS) {
        const until = now + LOCK_SECONDS;
        await dynamo.send(new UpdateItemCommand({
          TableName: table,
          Key: { id: { S: userId } },
          UpdateExpression: 'SET failedAttempts = :z, lockedUntil = :l',
          ExpressionAttributeValues: { ':z': { N: '0' }, ':l': { N: String(until) } },
        }));
        return { ok: false, pinSet, error: 'locked', lockedUntil: until };
      }
      return { ok: false, pinSet, error: 'wrong_pin', attemptsLeft: MAX_ATTEMPTS - failed };
    };

    if (action === 'verify') {
      if (!pinSet) return { ok: true, pinSet: false };
      const bad = await checkCurrent();
      return bad ?? { ok: true, pinSet: true };
    }

    if (action === 'remove') {
      if (!pinSet) return { ok: true, pinSet: false };
      const bad = await checkCurrent();
      if (bad) return bad;
      await dynamo.send(new DeleteItemCommand({ TableName: table, Key: { id: { S: userId } } }));
      return { ok: true, pinSet: false };
    }

    if (action === 'set') {
      if (!newPin || !PIN_PATTERN.test(newPin)) return { ok: false, pinSet, error: 'invalid_pin' };
      if (pinSet) {
        const bad = await checkCurrent();
        if (bad) return bad;
      }
      const salt = randomBytes(16);
      await dynamo.send(new PutItemCommand({
        TableName: table,
        Item: {
          id:             { S: userId },
          hash:           { S: hashPin(newPin, salt).toString('base64') },
          salt:           { S: salt.toString('base64') },
          failedAttempts: { N: '0' },
          lockedUntil:    { N: '0' },
          updatedAt:      { N: String(now) },
          __typename:     { S: 'EroticPin' },
        },
      }));
      return { ok: true, pinSet: true };
    }

    return { ok: false, pinSet, error: 'bad_request' };
  } catch (err) {
    console.error('erotic-pin error:', err);
    return { ok: false, pinSet: false, error: 'server_error' };
  }
};
