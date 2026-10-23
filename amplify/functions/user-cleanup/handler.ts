import { DynamoDBClient, QueryCommand, BatchWriteItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// When a User row is deleted (account deletion), remove everything that user owns: pins, finished /
// in-progress stories, ratings, reactions, favorites, follows, bookmarks, comments and push devices.
// Every target is read through a userId index (never a scan) and deleted in batches of 25. The
// deletes flow through the normal aggregator streams (ratings, comments, follows, ...), so counts
// stay right. Safe to retry: deleting a row twice is a no-op, so a failure just re-runs the batch.
const dynamo = new DynamoDBClient({});

type Target = { table: string; index: string };
const TARGETS: Target[] = JSON.parse(process.env.CLEANUP_TARGETS ?? '[]');

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function deleteBatch(table: string, ids: string[]) {
  let requests: any[] = ids.map(id => ({ DeleteRequest: { Key: { id: { S: id } } } }));
  for (let attempt = 0; requests.length > 0; attempt++) {
    if (attempt > 8) throw new Error(`Could not delete ${requests.length} item(s) from ${table}`);
    const res = await dynamo.send(new BatchWriteItemCommand({ RequestItems: { [table]: requests } }));
    requests = (res.UnprocessedItems?.[table] as any[]) ?? [];
    if (requests.length > 0) await sleep(200 * 2 ** attempt);
  }
}

async function cleanTarget(userId: string, t: Target): Promise<number> {
  let removed = 0;
  let lastKey: any;
  do {
    const res: any = await dynamo.send(new QueryCommand({
      TableName: t.table,
      IndexName: t.index,
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': { S: userId } },
      ProjectionExpression: 'id',
      ExclusiveStartKey: lastKey,
      Limit: 250,
    }));
    const ids: string[] = (res.Items ?? []).map((i: any) => i.id?.S).filter(Boolean);
    for (let i = 0; i < ids.length; i += 25) {
      await deleteBatch(t.table, ids.slice(i, i + 25));
    }
    removed += ids.length;
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return removed;
}

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    if (record.eventName !== 'REMOVE' || !record.dynamodb?.OldImage) continue;
    const user: any = unmarshall(record.dynamodb.OldImage as any);
    const userId: string | undefined = user.id;
    if (!userId) continue;

    let total = 0;
    for (const t of TARGETS) {
      total += await cleanTarget(userId, t);
    }

    // The account-level erotic PIN is keyed by the user id itself (no userId index), so delete it directly.
    const pinTable = process.env.EROTIC_PIN_TABLE_NAME;
    if (pinTable) {
      await dynamo.send(new DeleteItemCommand({ TableName: pinTable, Key: { id: { S: userId } } }));
    }
    console.log(`user-cleanup: removed ${total} row(s) for deleted user ${userId}`);
  }
};
