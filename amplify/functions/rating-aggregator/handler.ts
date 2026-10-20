import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Keeps Story.avgRating / Story.numRatings in step with UserRating rows.
// Several Lambda invocations can rate the same popular story at once, so the read-modify-write is
// guarded by an optimistic lock (the write only lands if the values we read are still current) and
// retried. Favorites are derived from UserRating (byUserIdAndRating index) - there is no separate
// favorites table to maintain.
const dynamo = new DynamoDBClient({});
const STORY_TABLE = process.env.STORY_TABLE_NAME!;
const MAX_ATTEMPTS = 8;

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: DynamoDBRecord) {
  const eventName = record.eventName; // INSERT | MODIFY | REMOVE
  if (eventName === 'REMOVE') return; // user deleted account - ignore

  const newImage = record.dynamodb?.NewImage ? unmarshall(record.dynamodb.NewImage as any) : null;
  if (!newImage) return;

  const { storyId, userId, rating: newRating } = newImage;
  if (!storyId || !userId || newRating == null) return;

  const oldImage = record.dynamodb?.OldImage ? unmarshall(record.dynamodb.OldImage as any) : null;
  const oldRating = oldImage?.rating ?? newRating;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { Item } = await dynamo.send(new GetItemCommand({
      TableName: STORY_TABLE,
      Key: { id: { S: storyId } },
      ProjectionExpression: 'avgRating, numRatings',
    }));
    if (!Item) return; // story no longer exists

    const avgRaw   = Item.avgRating?.N;
    const countRaw = Item.numRatings?.N;
    const currentAvg   = avgRaw ? parseFloat(avgRaw) : 0;
    const currentCount = countRaw ? parseInt(countRaw) : 0;

    let newAvg: number;
    let newCount: number;
    if (eventName === 'INSERT') {
      newCount = currentCount + 1;
      newAvg   = ((currentAvg * currentCount) + newRating) / newCount;
    } else {
      newCount = currentCount; // re-rating: count unchanged
      newAvg   = currentCount > 0 ? ((currentAvg * currentCount) - oldRating + newRating) / currentCount : newRating;
    }
    newAvg = Math.round(newAvg * 10) / 10; // 1 decimal

    try {
      await dynamo.send(new UpdateItemCommand({
        TableName: STORY_TABLE,
        Key: { id: { S: storyId } },
        UpdateExpression: 'SET avgRating = :avg, numRatings = :count',
        ConditionExpression:
          'attribute_exists(id) AND (attribute_not_exists(numRatings) OR numRatings = :oc) AND (attribute_not_exists(avgRating) OR avgRating = :oa)',
        ExpressionAttributeValues: {
          ':avg': { N: newAvg.toString() },
          ':count': { N: newCount.toString() },
          ':oc': { N: countRaw ?? '0' },
          ':oa': { N: avgRaw ?? '0' },
        },
      }));
      return;
    } catch (err: any) {
      if (err?.name !== 'ConditionalCheckFailedException') throw err;
      // Someone else updated this story between our read and write - read again and retry.
    }
  }
  throw new Error(`rating-aggregator: gave up after ${MAX_ATTEMPTS} attempts for story ${storyId}`);
}
