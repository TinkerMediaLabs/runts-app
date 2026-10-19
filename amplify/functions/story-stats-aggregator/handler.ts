import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Maintains a single StoryStats row (id = 'GLOBAL') with live / draft / erotic story counts so the
// CMS can show chip counts without scanning the Story table. Each stream record contributes
// (new image contribution) - (old image contribution); batch deltas are summed into one update.
const dynamo = new DynamoDBClient({});
const STATS_TABLE = process.env.STORY_STATS_TABLE_NAME!;

type Delta = { live: number; draft: number; erotic: number };

const contribution = (img: any | null): Delta => ({
  live:   img && img.live === 'true'  ? 1 : 0,
  draft:  img && img.live === 'false' ? 1 : 0,
  erotic: img && img.isErotic === 'true' ? 1 : 0,
});

export const handler = async (event: DynamoDBStreamEvent) => {
  const total: Delta = { live: 0, draft: 0, erotic: 0 };
  for (const record of event.Records) {
    const n = record.dynamodb?.NewImage ? contribution(unmarshall(record.dynamodb.NewImage as any)) : contribution(null);
    const o = record.dynamodb?.OldImage ? contribution(unmarshall(record.dynamodb.OldImage as any)) : contribution(null);
    total.live   += n.live   - o.live;
    total.draft  += n.draft  - o.draft;
    total.erotic += n.erotic - o.erotic;
  }
  if (!total.live && !total.draft && !total.erotic) return;

  const now = new Date().toISOString();
  await dynamo.send(new UpdateItemCommand({
    TableName: STATS_TABLE,
    Key: { id: { S: 'GLOBAL' } },
    UpdateExpression:
      'ADD #live :l, #draft :d, #erotic :e SET #updatedAt = :now, #createdAt = if_not_exists(#createdAt, :now), #tn = if_not_exists(#tn, :tn)',
    ExpressionAttributeNames: {
      '#live': 'live', '#draft': 'draft', '#erotic': 'erotic',
      '#updatedAt': 'updatedAt', '#createdAt': 'createdAt', '#tn': '__typename',
    },
    ExpressionAttributeValues: {
      ':l': { N: String(total.live) }, ':d': { N: String(total.draft) }, ':e': { N: String(total.erotic) },
      ':now': { S: now }, ':tn': { S: 'StoryStats' },
    },
  }));
  console.log('story stats delta', JSON.stringify(total));
};
