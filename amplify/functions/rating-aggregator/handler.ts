import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamo = new DynamoDBClient({});

const STORY_TABLE   = process.env.STORY_TABLE_NAME!;
const FAVE_TABLE    = process.env.FAVE_TABLE_NAME!;
const RATING_THRESHOLD = 8;

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: DynamoDBRecord) {
  const eventName = record.eventName; // INSERT | MODIFY | REMOVE

  if (eventName === 'REMOVE') return; // user deleted account — ignore

  const newImage = record.dynamodb?.NewImage
    ? unmarshall(record.dynamodb.NewImage as any)
    : null;

  if (!newImage) return;

  const { storyId, userId, rating: newRating } = newImage;
  if (!storyId || !userId || newRating == null) return;

  // ── Fetch current Story aggregates ───────────────────────────────────────
  const { Item: storyItem } = await dynamo.send(new GetItemCommand({
    TableName: STORY_TABLE,
    Key: { id: { S: storyId } },
    ProjectionExpression: 'avgRating, numRatings',
  }));

  const currentAvg    = storyItem?.avgRating?.N ? parseFloat(storyItem.avgRating.N) : 0;
  const currentCount  = storyItem?.numRatings?.N ? parseInt(storyItem.numRatings.N) : 0;

  let newAvg: number;
  let newCount: number;

  if (eventName === 'INSERT') {
    newCount = currentCount + 1;
    newAvg   = ((currentAvg * currentCount) + newRating) / newCount;
  } else {
    // MODIFY — adjust average using old rating from stream
    const oldImage = record.dynamodb?.OldImage
      ? unmarshall(record.dynamodb.OldImage as any)
      : null;
    const oldRating = oldImage?.rating ?? newRating;
    newCount = currentCount; // count doesn't change on re-rating
    newAvg   = currentCount > 0
      ? ((currentAvg * currentCount) - oldRating + newRating) / currentCount
      : newRating;
  }

  // Round to 1 decimal place
  newAvg = Math.round(newAvg * 10) / 10;

  // ── Update Story aggregates ───────────────────────────────────────────────
  await dynamo.send(new UpdateItemCommand({
    TableName: STORY_TABLE,
    Key: { id: { S: storyId } },
    UpdateExpression: 'SET avgRating = :avg, numRatings = :count',
    ExpressionAttributeValues: {
      ':avg':   { N: newAvg.toString() },
      ':count': { N: newCount.toString() },
    },
  }));

  // ── Handle favorites (>= 8 = add, < 8 = remove) ──────────────────────────
  await handleFavorite({ userId, storyId, newRating });
}

async function handleFavorite({
  userId,
  storyId,
  newRating,
}: {
  userId: string;
  storyId: string;
  newRating: number;
}) {
  // Check if a favorite record already exists
  const { Item: existing } = await dynamo.send(new GetItemCommand({
    TableName: FAVE_TABLE,
    Key: { userId: { S: userId }, storyId: { S: storyId } },
  }));

  if (newRating >= RATING_THRESHOLD && !existing) {
    // Add to favorites
    await dynamo.send(new UpdateItemCommand({
      TableName: FAVE_TABLE,
      Key: { userId: { S: userId }, storyId: { S: storyId } },
      UpdateExpression: 'SET favoritedAt = :now',
      ExpressionAttributeValues: {
        ':now': { S: new Date().toISOString() },
      },
    }));
  } else if (newRating < RATING_THRESHOLD && existing) {
    // Remove from favorites — use UpdateItem with a deletion marker
    // (DynamoDB delete requires knowing the full key — FAVE_TABLE uses userId+storyId)
    const { DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');
    await dynamo.send(new DeleteItemCommand({
      TableName: FAVE_TABLE,
      Key: {
        userId:  { S: userId },
        storyId: { S: storyId },
      },
    }));
  }
}