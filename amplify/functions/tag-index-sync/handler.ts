import { DynamoDBClient, UpdateItemCommand, GetItemCommand, QueryCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Keeps the "live stories of a tag" indexes in step, whoever writes the data (CMS, publish Lambda,
// restore scripts):
//   Story.liveTagId    = primaryTagId while live === 'true', otherwise REMOVED (sparse index: drafts are
//                        simply not in it, so tag pages never need to filter drafts out).
//   StoryTag.liveTagId = tagId while the story is live, otherwise removed.
//   StoryTag.publishedAt = the story's publishedAt (sort key).
// Also: when a Story is DELETED, its StoryTag and StoryNarrator link rows are deleted too (the CMS delete only
// removes the Story row). Deleting StoryTag rows lets tag-count-aggregator decrement the tag counts.
// Sources: Story stream (INSERT/MODIFY) and StoryTag stream (INSERT only). Every write is skipped when the
// value is already right, so the MODIFY events our own writes cause end the chain immediately.
const dynamo = new DynamoDBClient({});
const STORY_TABLE = process.env.STORY_TABLE_NAME!;
const STORYTAG_TABLE = process.env.STORYTAG_TABLE_NAME!;
const STORYNARRATOR_TABLE = process.env.STORYNARRATOR_TABLE_NAME!;

const isCondFail = (e: any) => e?.name === 'ConditionalCheckFailedException';

async function setOrRemove(table: string, key: Record<string, any>, attrs: Record<string, any | undefined>) {
  const sets: string[] = []; const removes: string[] = [];
  const names: Record<string, string> = {}; const values: Record<string, any> = {};
  let n = 0;
  for (const [attr, val] of Object.entries(attrs)) {
    const nk = `#a${n}`; names[nk] = attr;
    if (val === undefined) removes.push(nk);
    else { const vk = `:v${n}`; values[vk] = { S: val }; sets.push(`${nk} = ${vk}`); }
    n++;
  }
  const expr = [sets.length ? `SET ${sets.join(', ')}` : '', removes.length ? `REMOVE ${removes.join(', ')}` : ''].filter(Boolean).join(' ');
  try {
    await dynamo.send(new UpdateItemCommand({
      TableName: table, Key: key, UpdateExpression: expr,
      ConditionExpression: 'attribute_exists(id)',
      ExpressionAttributeNames: names,
      ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
    }));
  } catch (e) {
    if (!isCondFail(e)) throw e; // row deleted meanwhile - nothing to do
    console.warn('tag-index-sync: row missing, skipped', table, JSON.stringify(key));
  }
}

const liveOf = (story: any) => story?.live === 'true';

async function syncStoryTagRow(link: any, story: any) {
  const wantLive = liveOf(story) ? link.tagId : undefined;
  const wantPub = story?.publishedAt ?? undefined;
  if (link.liveTagId === wantLive && link.publishedAt === wantPub) return;
  await setOrRemove(STORYTAG_TABLE, { id: { S: link.id } }, { liveTagId: wantLive, publishedAt: wantPub });
}

async function deleteLinks(table: string, storyId: string) {
  let lastKey: any;
  do {
    const res: any = await dynamo.send(new QueryCommand({
      TableName: table, IndexName: 'byStoryId',
      KeyConditionExpression: 'storyId = :s', ExpressionAttributeValues: { ':s': { S: storyId } },
      ExclusiveStartKey: lastKey,
    }));
    for (const it of res.Items ?? []) {
      await dynamo.send(new DeleteItemCommand({ TableName: table, Key: { id: it.id } }));
    }
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
}

async function handleStory(record: DynamoDBRecord) {
  if (record.eventName === 'REMOVE') {
    const gone: any = record.dynamodb?.OldImage ? unmarshall(record.dynamodb.OldImage as any) : null;
    if (gone?.id) {
      await deleteLinks(STORYTAG_TABLE, gone.id);
      await deleteLinks(STORYNARRATOR_TABLE, gone.id);
    }
    return;
  }
  if (!record.dynamodb?.NewImage) return;
  const story: any = unmarshall(record.dynamodb.NewImage as any);
  const old: any = record.dynamodb.OldImage ? unmarshall(record.dynamodb.OldImage as any) : null;

  const wantLiveTag = liveOf(story) && story.primaryTagId ? story.primaryTagId : undefined;
  if (story.liveTagId !== wantLiveTag) {
    await setOrRemove(STORY_TABLE, { id: { S: story.id } }, { liveTagId: wantLiveTag });
  }

  // Propagate to this story's StoryTag rows only when live / publishedAt actually changed.
  const changed = !old || old.live !== story.live || old.publishedAt !== story.publishedAt;
  if (!changed) return;
  let lastKey: any;
  do {
    const res: any = await dynamo.send(new QueryCommand({
      TableName: STORYTAG_TABLE, IndexName: 'byStoryId',
      KeyConditionExpression: 'storyId = :s', ExpressionAttributeValues: { ':s': { S: story.id } },
      ExclusiveStartKey: lastKey,
    }));
    for (const it of res.Items ?? []) await syncStoryTagRow(unmarshall(it), story);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
}

async function handleStoryTagInsert(record: DynamoDBRecord) {
  if (record.eventName !== 'INSERT' || !record.dynamodb?.NewImage) return;
  const link: any = unmarshall(record.dynamodb.NewImage as any);
  if (!link.storyId) return;
  const { Item } = await dynamo.send(new GetItemCommand({ TableName: STORY_TABLE, Key: { id: { S: link.storyId } } }));
  if (!Item) { console.warn('tag-index-sync: story not found for link', link.id, link.storyId); return; }
  await syncStoryTagRow(link, unmarshall(Item));
}

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    const arn = record.eventSourceARN ?? '';
    // ARN looks like arn:aws:dynamodb:<region>:<account>:table/<name>/stream/<time> (a colon, not a slash, before "table").
    if (arn.includes(`:table/${STORYTAG_TABLE}/`)) await handleStoryTagInsert(record);
    else await handleStory(record);
  }
};
