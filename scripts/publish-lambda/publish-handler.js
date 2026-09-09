'use strict';

const { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, CopyObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION        = 'us-east-2';
const STAGING_ID    = 'nflzecthnfb2noim4kgzmddjre';
const PROD_ID       = 'nzvkuznrzjfc5kud3vfik5j7ey';
const STAGING_BUCKET = 'amplify-runts-staging-san-runtsstoragebucketf8df8e-ixeas7ief3e3';
const PROD_BUCKET    = 'amplify-di214r77g48tp-pro-runtsstoragebucketf8df8e-dwm5plyozk1b';

const dynamo = new DynamoDBClient({ region: REGION });
const s3     = new S3Client({ region: REGION });

const stg  = (model) => `${model}-${STAGING_ID}-NONE`;
const prod = (model) => `${model}-${PROD_ID}-NONE`;

const CORS_HEADERS = {
    'Content-Type':                 'application/json',
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

// ---------------------------------------------------------------------------
// DynamoDB helpers
// ---------------------------------------------------------------------------

async function getItem(table, id) {
    const res = await dynamo.send(new GetItemCommand({
        TableName: table,
        Key:       marshall({ id }),
    }));
    return res.Item ? unmarshall(res.Item) : null;
}

async function upsertItem(table, item) {
    await dynamo.send(new PutItemCommand({
        TableName: table,
        Item:      marshall(item, { removeUndefinedValues: true }),
    }));
}

async function createIfNotExists(table, item) {
    try {
        await dynamo.send(new PutItemCommand({
            TableName:           table,
            Item:                marshall(item, { removeUndefinedValues: true }),
            ConditionExpression: 'attribute_not_exists(id)',
        }));
        return 'created';
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') return 'exists';
        throw err;
    }
}

async function scanByField(table, field, value) {
    const items = [];
    let lastKey;
    do {
        const res = await dynamo.send(new ScanCommand({
            TableName:                 table,
            FilterExpression:          `${field} = :v`,
            ExpressionAttributeValues: marshall({ ':v': value }),
            ExclusiveStartKey:         lastKey,
        }));
        items.push(...(res.Items || []).map(i => unmarshall(i)));
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return items;
}

// ---------------------------------------------------------------------------
// S3 helpers
// ---------------------------------------------------------------------------

async function copyS3Asset(key) {
    if (!key || key.startsWith('http')) return false;
    try {
        await s3.send(new HeadObjectCommand({ Bucket: STAGING_BUCKET, Key: key }));
        await s3.send(new CopyObjectCommand({
            CopySource: `${STAGING_BUCKET}/${encodeURIComponent(key).replace(/%2F/g, '/')}`,
            Bucket:     PROD_BUCKET,
            Key:        key,
        }));
        console.log(`Copied S3: ${key}`);
        return true;
    } catch (err) {
        console.warn(`S3 copy skipped for ${key}: ${err.message}`);
        return false;
    }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

exports.handler = async (event) => {

    // CORS preflight
    if (event.requestContext?.http?.method === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    // Auth
    const apiKey = event.headers?.['x-api-key'] ?? event.headers?.['X-Api-Key'];
    if (apiKey !== process.env.PUBLISH_API_KEY) {
        return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    let storyId;
    try {
        ({ storyId } = JSON.parse(event.body ?? '{}'));
    } catch {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    if (!storyId) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'storyId is required' }) };
    }

    try {
        const log = [];

        // ── 1. Fetch story from staging ──────────────────────────────────────
        const story = await getItem(stg('Story'), storyId);
        if (!story) {
            return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: `Story ${storyId} not found in staging` }) };
        }
        log.push(`Found story: "${story.title}"`);

        // ── 2. Fetch author from staging ─────────────────────────────────────
        let author = null;
        if (story.authorId) {
            author = await getItem(stg('Author'), story.authorId);
            if (author) log.push(`Found author: "${author.name}"`);
        }

        // ── 3. Fetch StoryTag records from staging ───────────────────────────
        const storyTagRecords = await scanByField(stg('StoryTag'), 'storyId', storyId);
        log.push(`Found ${storyTagRecords.length} StoryTag record(s)`);

        // ── 4. Fetch tags from staging ───────────────────────────────────────
        const tagIds  = [...new Set(storyTagRecords.map(st => st.tagId).filter(Boolean))];
        if (story.primaryTagId)   tagIds.push(story.primaryTagId);
        if (story.secondaryTagId) tagIds.push(story.secondaryTagId);
        const uniqueTagIds = [...new Set(tagIds)];

        const tags = (await Promise.all(uniqueTagIds.map(id => getItem(stg('Tag'), id)))).filter(Boolean);
        log.push(`Found ${tags.length} tag(s)`);

        // ── 5. Copy author to production ─────────────────────────────────────
        if (author) {
            const res = await createIfNotExists(prod('Author'), author);
            log.push(`Author: ${res}`);
            if (author.profilePicUri) await copyS3Asset(author.profilePicUri);
        }

        // ── 6. Copy tags to production ───────────────────────────────────────
        for (const tag of tags) {
            const res = await createIfNotExists(prod('Tag'), tag);
            log.push(`Tag "${tag.name}": ${res}`);
            if (tag.imageUri)    await copyS3Asset(tag.imageUri);
            if (tag.tileImageUri && tag.tileImageUri !== tag.imageUri) await copyS3Asset(tag.tileImageUri);
        }

        // ── 7. Copy S3 assets ────────────────────────────────────────────────
        if (story.imageUri) await copyS3Asset(story.imageUri);
        if (story.audioUri) await copyS3Asset(story.audioUri);

        // ── 8. Upsert story to production (always live: false) ───────────────
        const prodStory = { ...story, live: 'false' };
        await upsertItem(prod('Story'), prodStory);
        log.push(`Story upserted to production (live: false)`);

        // ── 9. Copy StoryTag records to production ───────────────────────────
        for (const st of storyTagRecords) {
            await createIfNotExists(prod('StoryTag'), st);
        }
        log.push(`StoryTag records copied`);

        return {
            statusCode: 200,
            headers:    CORS_HEADERS,
            body:       JSON.stringify({
                success: true,
                storyId,
                title:   story.title,
                log,
                message: 'Published to production as draft. Go to admin.tinkermedia.net to make it live.',
            }),
        };

    } catch (err) {
        console.error('Publish error:', err);
        return {
            statusCode: 500,
            headers:    CORS_HEADERS,
            body:       JSON.stringify({ error: err.message }),
        };
    }
};