import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const dynamo = new DynamoDBClient({});

export const handler = async (event: any) => {
  const storyId = event.arguments?.storyId;

  if (!storyId) {
    return false;
  }

  const tableName = process.env.STORY_TABLE_NAME;
  if (!tableName) {
    console.error('STORY_TABLE_NAME env var not set');
    return false;
  }

  try {
    await dynamo.send(new UpdateItemCommand({
      TableName: tableName,
      Key: { id: { S: storyId } },
      UpdateExpression: 'ADD numListens :one',
      ExpressionAttributeValues: { ':one': { N: '1' } },
    }));
    return true;
  } catch (err) {
    console.error('increment-listens error:', err);
    return false;
  }
};