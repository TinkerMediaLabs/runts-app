'use strict';

const {
    DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand, ScanCommand, QueryCommand,
} = require('@aws-sdk/client-dynamodb');
const { S3Client, CopyObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

// NOTE: these are DynamoDB TABLE-NAME suffixes (Model-<suffix>-NONE), NOT AppSync API ids.
const REGION         = 'us-east-2';
const STAGING_ID     = '5ojmsd7i5nbq5foh2wefkdhj3e';
const PROD_ID        = 'nzvkuznrzjfc5kud3vfik5j7ey';
const STAGING_BUCKET = 'amplify-runts-staging-san-runtsstoragebucketf8df8e-ixeas7ief3e3';
const PROD_BUCKET    = 'amplify-di214r77g48tp-pro-runtsstoragebucketf8df8e-dwm5plyozk1b';

const dynamo = new DynamoDBClient({ region: REGION });
const s3     = new S3Client({ region: REGION });

const stg  = (model) => `${model}-${STAGING_ID}-NONE`;
const prod = (model) => `${model}-${PROD_ID}-NONE`;

const CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

// ── DynamoDB helpers ────────────────────────────────────────────────────────

async function getItem(table, id) {
    const res = await dynamo.send(new GetItemCommand({ TableName: table, Key: marshall({ id }) }));
    return res.Item ? unmarshall(res.Item) : null;
}

async function upsertItem(table, item) {
    await dynamo.send(new PutItemCommand({ TableName: table, Item: marshall(item, { removeUndefinedValues: true }) }));
}

async function createIfNotExists(table, item) {
    try {
        await dynamo.send(new PutItemCommand({
            TableName: table,
            Item: marshall(item, { removeUndefinedValues: true }),
            ConditionExpression: 'attribute_not_exists(id)',
        }));
        return 'created';
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') return 'exists';
        throw err;
    }
}

async function deleteItem(table, id) {
    await dynamo.send(new DeleteItemCommand({ TableName: table, Key: marshall({ id }) }));
}

// All join rows for a story. Uses the byStoryId index (query, not scan). If a table does not have the
// index yet (e.g. production before the scaled schema is deployed) it falls back to a filtered scan.
async function linksForStory(table, storyId) {
    const items = [];
    let lastKey;
    try {
        do {
            const res = await dynamo.send(new QueryCommand({
                TableName: table,
                IndexName: 'byStoryId',
                KeyConditionExpression: 'storyId = :s',
                ExpressionAttributeValues: marshall({ ':s': storyId }),
                ExclusiveStartKey: lastKey,
            }));
            items.push(...(res.Items || []).map(i => unmarshall(i)));
            lastKey = res.LastEvaluatedKey;
        } while (lastKey);
        return items;
    } catch (err) {
        if (err.name !== 'ValidationException') throw err;
        console.warn(`${table}: byStoryId index missing, falling back to scan`);
    }
    const out = [];
    lastKey = undefined;
    do {
        const res = await dynamo.send(new ScanCommand({
            TableName: table,
            FilterExpression: 'storyId = :s',
            ExpressionAttributeValues: marshall({ ':s': storyId }),
            ExclusiveStartKey: lastKey,
        }));
        out.push(...(res.Items || []).map(i => unmarshall(i)));
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return out;
}

// Make production's links for this story exactly match staging's: keep one row per target id,
// create the missing ones, delete removed ones and duplicates.
async function syncLinks(model, fk, storyId, stagingLinks, log) {
    const wanted = new Map();
    for (const l of stagingLinks) if (l[fk] && !wanted.has(l[fk])) wanted.set(l[fk], l);

    const existing = await linksForStory(prod(model), storyId);
    const seen = new Set();
    let deleted = 0;
    for (const row of existing) {
        if (!wanted.has(row[fk]) || seen.has(row[fk])) {
            await deleteItem(prod(model), row.id);
            deleted++;
        } else {
            seen.add(row[fk]);
        }
    }
    let created = 0;
    for (const [targetId, link] of wanted) {
        if (seen.has(targetId)) continue;
        const { liveTagId: _l, ...linkFields } = link;   // production's tag-index-sync sets this
        const res = await createIfNotExists(prod(model), linkFields);
        if (res === 'created') created++;
    }
    log.push(`${model}: ${wanted.size} link(s) in sync (${created} created, ${deleted} removed)`);
}

// ── S3 helper ───────────────────────────────────────────────────────────────

async function copyS3Asset(key) {
    if (!key || key.startsWith('http')) return false;
    try {
        await s3.send(new HeadObjectCommand({ Bucket: STAGING_BUCKET, Key: key }));
        await s3.send(new CopyObjectCommand({
            CopySource: `${STAGING_BUCKET}/${encodeURIComponent(key).replace(/%2F/g, '/')}`,
            Bucket: PROD_BUCKET,
            Key: key,
        }));
        console.log(`Copied S3: ${key}`);
        return true;
    } catch (err) {
        console.warn(`S3 copy skipped for ${key}: ${err.message}`);
        return false;
    }
}

// ── Handler ─────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
    if (event.requestContext?.http?.method === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: '' };
    }

    const apiKey = event.headers?.['x-api-key'] ?? event.headers?.['X-Api-Key'];
    if (apiKey !== process.env.PUBLISH_API_KEY) {
        return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    let storyId;
    try { ({ storyId } = JSON.parse(event.body ?? '{}')); }
    catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }
    if (!storyId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'storyId required' }) };

    try {
        const log = [];

        // 1. Story
        const story = await getItem(stg('Story'), storyId);
        if (!story) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Story not found in staging' }) };
        log.push(`Found story: "${story.title}"`);

        // 2. Author
        let author = null;
        if (story.authorId) {
            author = await getItem(stg('Author'), story.authorId);
            if (author) log.push(`Found author: "${author.name}"`);
        }

        // 3. Universe
        let universe = null;
        if (story.universeId) {
            universe = await getItem(stg('Universe'), story.universeId);
            if (universe) log.push(`Found universe: "${universe.name}"`);
        }

        // 4. Join rows (indexed query)
        const storyTagLinks      = await linksForStory(stg('StoryTag'), storyId);
        const storyNarratorLinks = await linksForStory(stg('StoryNarrator'), storyId);
        log.push(`Found ${storyTagLinks.length} StoryTag and ${storyNarratorLinks.length} StoryNarrator record(s)`);

        // 5. Tags and narrators
        const tagIds = [...new Set([
            ...storyTagLinks.map(l => l.tagId), story.primaryTagId, story.secondaryTagId,
        ].filter(Boolean))];
        const tags = (await Promise.all(tagIds.map(id => getItem(stg('Tag'), id)))).filter(Boolean);

        const narratorIds = [...new Set(storyNarratorLinks.map(l => l.narratorId).filter(Boolean))];
        const narrators = (await Promise.all(narratorIds.map(id => getItem(stg('Narrator'), id)))).filter(Boolean);
        log.push(`Found ${tags.length} tag(s), ${narrators.length} narrator(s)`);

        // 6. Copy reference records (create only if missing; never overwrite production edits)
        if (author) {
            log.push(`Author: ${await createIfNotExists(prod('Author'), author)}`);
            if (author.profilePicUri) await copyS3Asset(author.profilePicUri);
        }
        if (universe) log.push(`Universe: ${await createIfNotExists(prod('Universe'), universe)}`);
        for (const n of narrators) {
            log.push(`Narrator "${n.name}": ${await createIfNotExists(prod('Narrator'), n)}`);
            if (n.profilePicUri) await copyS3Asset(n.profilePicUri);
        }
        for (const tag of tags) {
            // storyCount is maintained by the tag-count-aggregator from StoryTag inserts in production;
            // copying staging's count would double-count, so new tags start at 0.
            const res = await createIfNotExists(prod('Tag'), { ...tag, storyCount: 0 });
            log.push(`Tag "${tag.name}": ${res}`);
            if (tag.imageUri) await copyS3Asset(tag.imageUri);
            if (tag.tileImageUri && tag.tileImageUri !== tag.imageUri) await copyS3Asset(tag.tileImageUri);
            if (tag.heroImageUri && tag.heroImageUri !== tag.imageUri) await copyS3Asset(tag.heroImageUri);
        }

        // 7. Story assets
        if (story.imageUri) await copyS3Asset(story.imageUri);
        if (story.audioUri) await copyS3Asset(story.audioUri);

        // 8. Story (always a draft in production).
        // Counters (listens, ratings, comments) belong to production: keep the existing values on a
        // re-publish and start new stories at zero instead of carrying staging test numbers across.
        // liveTagId is maintained by production's tag-index-sync, never copied from staging.
        const existingProd = await getItem(prod('Story'), storyId);
        const { liveTagId: _liveTagId, ...storyFields } = story;
        await upsertItem(prod('Story'), {
            ...storyFields,
            live: 'false',
            numListens:  existingProd?.numListens  ?? 0,
            numRatings:  existingProd?.numRatings  ?? 0,
            numComments: existingProd?.numComments ?? 0,
            avgRating:   existingProd?.avgRating,
        });
        log.push(`Story upserted to production (live: false${existingProd ? ', production counters kept' : ''})`);

        // 9. Links mirror staging exactly (removed tags/narrators and duplicates are cleaned up)
        await syncLinks('StoryTag', 'tagId', storyId, storyTagLinks, log);
        await syncLinks('StoryNarrator', 'narratorId', storyId, storyNarratorLinks, log);

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                success: true, storyId, title: story.title, log,
                message: 'Published to production as draft. Go to admin.tinkermedia.net to make it live.',
            }),
        };
    } catch (err) {
        console.error('Publish error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    }
};
