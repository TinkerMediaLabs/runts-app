import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { incrementListens } from './functions/increment-listens/resource';
import { ratingAggregator } from './functions/rating-aggregator/resource';
import { reactionAggregator } from './functions/reaction-aggregator/resource';
import { commentCounter } from './functions/comment-counter/resource';
import { tagCountAggregator } from './functions/tag-count-aggregator/resource';
import { storyStatsAggregator } from './functions/story-stats-aggregator/resource';
import { followCountAggregator } from './functions/follow-count-aggregator/resource';
import { tagIndexSync } from './functions/tag-index-sync/resource';
import { listensAggregator } from './functions/listens-aggregator/resource';
import { userCleanup } from './functions/user-cleanup/resource';
import { eroticPin } from './functions/erotic-pin/resource';
import { uploadUrl } from './functions/upload-url/resource';
import { trendingSnapshot } from './functions/trending-snapshot/resource';
import { tagInsights } from './functions/tag-insights/resource';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource, SqsDlq } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Duration, Stack } from 'aws-cdk-lib';

const backend = defineBackend({
  auth,
  data,
  storage,
  incrementListens,
  ratingAggregator,
  reactionAggregator,
  commentCounter,
  tagCountAggregator,
  storyStatsAggregator,
  followCountAggregator,
  tagIndexSync,
  listensAggregator,
  userCleanup,
  eroticPin,
  uploadUrl,
  trendingSnapshot,
  tagInsights,
});

const storyTable         = backend.data.resources.tables['Story'];
const ratingTable        = backend.data.resources.tables['UserRating'];
const reactionTable      = backend.data.resources.tables['UserReaction'];
const commentTable       = backend.data.resources.tables['Comment'];
const faveTable          = backend.data.resources.tables['UserFavoritedStory'];
const reactionCountTable = backend.data.resources.tables['StoryReactionCount'];
const tagTable       = backend.data.resources.tables['Tag'];
const storyTagTable  = backend.data.resources.tables['StoryTag'];
const storyStatsTable = backend.data.resources.tables['StoryStats'];
const userTable        = backend.data.resources.tables['User'];
const storyNarratorTable = backend.data.resources.tables['StoryNarrator'];
const followTable      = backend.data.resources.tables['UserFollowedAuthor'];
const listenBufferTable = backend.data.resources.tables['StoryListenBuffer'];
const listenDedupeTable = backend.data.resources.tables['ListenDedupe'];
const eroticPinTable    = backend.data.resources.tables['EroticPin'];
const listenDayTable    = backend.data.resources.tables['StoryListenDay'];
const trendingTable     = backend.data.resources.tables['TrendingSnapshot'];
const tagInsightTable   = backend.data.resources.tables['TagInsight'];

// ── stream failure queue ──────────────────────────────────────────────────
// Stream records that still fail after their retries land here (kept 14 days) instead of being
// silently dropped, so aggregator drift can be seen and replayed.
const streamFailureStack = backend.createStack('StreamFailures');
const streamFailureQueue = new sqs.Queue(streamFailureStack, 'StreamFailureQueue', {
  retentionPeriod: Duration.days(14),
});
const onFailure = new SqsDlq(streamFailureQueue);

// ── upload-url ────────────────────────────────────────────────────────────
// Signs short-lived upload links for the CMS. The storage rules are read-only for app users, so this
// function (admin-only) is the only way to write story / author / narrator files.
const uploadUrlFn = backend.uploadUrl.resources.lambda as lambda.Function;
const storageBucket = backend.storage.resources.bucket;
uploadUrlFn.addEnvironment('STORAGE_BUCKET_NAME', storageBucket.bucketName);
['stories/*', 'authors/*', 'narrators/*'].forEach(prefix => storageBucket.grantPut(uploadUrlFn, prefix));

// ── erotic-pin ────────────────────────────────────────────────────────────
const eroticPinFn = backend.eroticPin.resources.lambda as lambda.Function;
eroticPinFn.addEnvironment('EROTIC_PIN_TABLE_NAME', eroticPinTable.tableName);
eroticPinTable.grantReadWriteData(eroticPinFn);

// ── increment-listens ─────────────────────────────────────────────────────
const incrementListensFn = backend.incrementListens.resources.lambda as lambda.Function;
incrementListensFn.addEnvironment('LISTEN_BUFFER_TABLE_NAME', listenBufferTable.tableName);
incrementListensFn.addEnvironment('LISTEN_DEDUPE_TABLE_NAME', listenDedupeTable.tableName);
listenBufferTable.grantReadWriteData(incrementListensFn);
listenDedupeTable.grantReadWriteData(incrementListensFn);
// Dedupe rows expire on their own (TTL attribute `expiresAt`, epoch seconds).
backend.data.resources.cfnResources.amplifyDynamoDbTables['ListenDedupe'].timeToLiveAttribute = {
  attributeName: 'expiresAt',
  enabled: true,
};

// ── listens-aggregator ────────────────────────────────────────────────────
const listensAggregatorFn = backend.listensAggregator.resources.lambda as lambda.Function;
listensAggregatorFn.addEnvironment('STORY_TABLE_NAME', storyTable.tableName);
storyTable.grantReadWriteData(listensAggregatorFn);
listensAggregatorFn.addEnvironment('DAY_TABLE_NAME', listenDayTable.tableName);
listenDayTable.grantReadWriteData(listensAggregatorFn);
listenBufferTable.grantStreamRead(listensAggregatorFn);
listensAggregatorFn.addEventSource(new DynamoEventSource(listenBufferTable, {
  startingPosition: StartingPosition.LATEST,
  batchSize: 100,
  maxBatchingWindow: Duration.seconds(60),
  retryAttempts: 2,
  bisectBatchOnError: true,
  onFailure,
}));

// ── trending-snapshot (hourly) ─────────────────────────────────────────────
const trendingSnapshotFn = backend.trendingSnapshot.resources.lambda as lambda.Function;
trendingSnapshotFn.addEnvironment('DAY_TABLE_NAME', listenDayTable.tableName);
trendingSnapshotFn.addEnvironment('SNAPSHOT_TABLE_NAME', trendingTable.tableName);
listenDayTable.grantReadWriteData(trendingSnapshotFn);
trendingTable.grantReadWriteData(trendingSnapshotFn);
trendingSnapshotFn.addEnvironment('TAG_INSIGHT_TABLE_NAME', tagInsightTable.tableName);
tagInsightTable.grantReadWriteData(trendingSnapshotFn);
// The CDK grant covers the table but not its indexes on Amplify-managed tables; the byDay query needs this.
trendingSnapshotFn.addToRolePolicy(new iam.PolicyStatement({
  actions: ['dynamodb:Query'],
  resources: [`${listenDayTable.tableArn}/index/*`],
}));

// ── tag-insights (every 3 hours) ───────────────────────────────────────────
const tagInsightsFn = backend.tagInsights.resources.lambda as lambda.Function;
tagInsightsFn.addEnvironment('STORYTAG_TABLE_NAME', storyTagTable.tableName);
tagInsightsFn.addEnvironment('TAG_TABLE_NAME', tagTable.tableName);
tagInsightsFn.addEnvironment('TAG_INSIGHT_TABLE_NAME', tagInsightTable.tableName);
storyTagTable.grantReadData(tagInsightsFn);
tagTable.grantReadData(tagInsightsFn);
tagInsightTable.grantReadWriteData(tagInsightsFn);
// Scanning the live-links index needs the index grant spelled out (see trending-snapshot above).
tagInsightsFn.addToRolePolicy(new iam.PolicyStatement({
  actions: ['dynamodb:Scan'],
  resources: [`${storyTagTable.tableArn}/index/*`],
}));

// ── rating-aggregator ─────────────────────────────────────────────────────
const ratingAggregatorFn = backend.ratingAggregator.resources.lambda as lambda.Function;
ratingAggregatorFn.addEnvironment('STORY_TABLE_NAME', storyTable.tableName);
ratingAggregatorFn.addEnvironment('FAVE_TABLE_NAME', faveTable.tableName);
storyTable.grantReadWriteData(ratingAggregatorFn);
faveTable.grantReadWriteData(ratingAggregatorFn);
ratingTable.grantStreamRead(ratingAggregatorFn);
ratingAggregatorFn.addEventSource(new DynamoEventSource(ratingTable, {
  startingPosition: StartingPosition.LATEST,
  batchSize: 10,
  retryAttempts: 2,
  bisectBatchOnError: true,
  onFailure,
}));

// ── reaction-aggregator ───────────────────────────────────────────────────
const reactionAggregatorFn = backend.reactionAggregator.resources.lambda as lambda.Function;
reactionAggregatorFn.addEnvironment('REACTION_COUNT_TABLE_NAME', reactionCountTable.tableName);
reactionCountTable.grantReadWriteData(reactionAggregatorFn);
reactionTable.grantStreamRead(reactionAggregatorFn);
reactionAggregatorFn.addEventSource(new DynamoEventSource(reactionTable, {
  startingPosition: StartingPosition.LATEST,
  batchSize: 10,
  retryAttempts: 2,
  bisectBatchOnError: true,
  onFailure,
}));

// ── comment-counter ───────────────────────────────────────────────────────
const commentCounterFn = backend.commentCounter.resources.lambda as lambda.Function;
commentCounterFn.addEnvironment('STORY_TABLE_NAME', storyTable.tableName);
storyTable.grantReadWriteData(commentCounterFn);
commentTable.grantStreamRead(commentCounterFn);
commentCounterFn.addEventSource(new DynamoEventSource(commentTable, {
  startingPosition: StartingPosition.LATEST,
  batchSize: 10,
  retryAttempts: 2,
  bisectBatchOnError: true,
  onFailure,
}));

// ── tag-count-aggregator ──────────────────────────────────────────────────
const tagCountAggregatorFn = backend.tagCountAggregator.resources.lambda as lambda.Function;
tagCountAggregatorFn.addEnvironment('TAG_TABLE_NAME', tagTable.tableName);
tagTable.grantReadWriteData(tagCountAggregatorFn);
storyTagTable.grantStreamRead(tagCountAggregatorFn);
tagCountAggregatorFn.addEventSource(new DynamoEventSource(storyTagTable, {
  startingPosition: StartingPosition.LATEST,
  batchSize: 10,
  retryAttempts: 2,
  bisectBatchOnError: true,
  onFailure,
}));

// ── story-stats-aggregator ────────────────────────────────────────────────
const storyStatsAggregatorFn = backend.storyStatsAggregator.resources.lambda as lambda.Function;
storyStatsAggregatorFn.addEnvironment('STORY_STATS_TABLE_NAME', storyStatsTable.tableName);
storyStatsTable.grantReadWriteData(storyStatsAggregatorFn);
storyTable.grantStreamRead(storyStatsAggregatorFn);
storyStatsAggregatorFn.addEventSource(new DynamoEventSource(storyTable, {
  startingPosition: StartingPosition.LATEST,
  batchSize: 10,
  retryAttempts: 2,
  bisectBatchOnError: true,
  onFailure,
}));

// ── follow-count-aggregator ───────────────────────────────────────────────
const followCountAggregatorFn = backend.followCountAggregator.resources.lambda as lambda.Function;
followCountAggregatorFn.addEnvironment('USER_TABLE_NAME', userTable.tableName);
userTable.grantReadWriteData(followCountAggregatorFn);
followTable.grantStreamRead(followCountAggregatorFn);
followCountAggregatorFn.addEventSource(new DynamoEventSource(followTable, {
  startingPosition: StartingPosition.LATEST,
  batchSize: 10,
  retryAttempts: 2,
  bisectBatchOnError: true,
  onFailure,
}));

// ── tag-index-sync ────────────────────────────────────────────────────────
const tagIndexSyncFn = backend.tagIndexSync.resources.lambda as lambda.Function;
tagIndexSyncFn.addEnvironment('STORY_TABLE_NAME', storyTable.tableName);
tagIndexSyncFn.addEnvironment('STORYTAG_TABLE_NAME', storyTagTable.tableName);
tagIndexSyncFn.addEnvironment('STORYNARRATOR_TABLE_NAME', storyNarratorTable.tableName);
storyNarratorTable.grantReadWriteData(tagIndexSyncFn);
storyTable.grantReadWriteData(tagIndexSyncFn);
storyTagTable.grantReadWriteData(tagIndexSyncFn);
storyTable.grantStreamRead(tagIndexSyncFn);
storyTagTable.grantStreamRead(tagIndexSyncFn);
tagIndexSyncFn.addEventSource(new DynamoEventSource(storyTable, {
  startingPosition: StartingPosition.LATEST,
  batchSize: 10,
  retryAttempts: 2,
  bisectBatchOnError: true,
  onFailure,
}));
tagIndexSyncFn.addEventSource(new DynamoEventSource(storyTagTable, {
  startingPosition: StartingPosition.LATEST,
  batchSize: 10,
  retryAttempts: 2,
  bisectBatchOnError: true,
  onFailure,
}));

// ── index query permissions ───────────────────────────────────────────────
// grantReadWriteData on these table handles does not cover their GSIs, so Lambdas that Query an
// index need it granted explicitly.
tagIndexSyncFn.addToRolePolicy(new iam.PolicyStatement({
  actions: ['dynamodb:Query'],
  resources: [`${storyTagTable.tableArn}/index/*`, `${storyNarratorTable.tableArn}/index/*`],
}));
reactionAggregatorFn.addToRolePolicy(new iam.PolicyStatement({
  actions: ['dynamodb:Query'],
  resources: [`${reactionCountTable.tableArn}/index/*`],
}));

// ── user-cleanup ──────────────────────────────────────────────────────────
// Account deletion only removes the User row from the app; this Lambda (fired by that row's REMOVE
// stream record) deletes everything the user owned, reading each table through its userId index.
const userCleanupFn = backend.userCleanup.resources.lambda as lambda.Function;
const cleanupTargets: { model: string; index: string }[] = [
  { model: 'UserPinnedStory',     index: 'byUserAndStory' },
  { model: 'UserFinishedStory',   index: 'byUserAndStory' },
  { model: 'UserInProgressStory', index: 'byUserAndStory' },
  { model: 'UserRating',          index: 'byUserAndStory' },
  { model: 'UserReaction',        index: 'byUserAndStory' },
  { model: 'UserFavoritedStory',  index: 'byUserAndStory' },
  { model: 'UserFollowedAuthor',  index: 'byUserAndAuthor' },
  { model: 'UserBookmark',        index: 'byUserAndCreatedAt' },
  { model: 'UserDevice',          index: 'byUserId' },
  { model: 'Comment',             index: 'byUserAndCreatedAt' },
  { model: 'UserBlock',           index: 'byUserAndBlocked' },
  { model: 'CommentReport',       index: 'byUserAndComment' },
];
userCleanupFn.addEnvironment('CLEANUP_TARGETS', Stack.of(userCleanupFn).toJsonString(
  cleanupTargets.map(t => ({ table: backend.data.resources.tables[t.model].tableName, index: t.index })),
));
userCleanupFn.addEnvironment('EROTIC_PIN_TABLE_NAME', eroticPinTable.tableName);
eroticPinTable.grantWriteData(userCleanupFn);
userCleanupFn.addToRolePolicy(new iam.PolicyStatement({
  actions: ['dynamodb:Query', 'dynamodb:BatchWriteItem', 'dynamodb:DeleteItem'],
  resources: cleanupTargets.flatMap(t => {
    const arn = backend.data.resources.tables[t.model].tableArn;
    return [arn, `${arn}/index/*`];
  }),
}));
userTable.grantStreamRead(userCleanupFn);
userCleanupFn.addEventSource(new DynamoEventSource(userTable, {
  startingPosition: StartingPosition.LATEST,
  batchSize: 1,
  retryAttempts: 2,
  bisectBatchOnError: true,
  onFailure,
  filters: [lambda.FilterCriteria.filter({ eventName: lambda.FilterRule.isEqual('REMOVE') })],
}));


// ── backups (production only) ─────────────────────────────────────────────
// Point-in-time recovery on every table (restore to any second in the last 35 days) and versioning on the
// storage bucket (an overwritten or deleted file can be brought back; old versions expire after 30 days
// so cost stays bounded). Sandboxes and staging skip this to avoid the extra cost.
if (process.env.AWS_BRANCH === 'production') {
  Object.values(backend.data.resources.cfnResources.amplifyDynamoDbTables).forEach(table => {
    table.pointInTimeRecoveryEnabled = true;
  });
  const cfnBucket = backend.storage.resources.cfnResources.cfnBucket;
  cfnBucket.versioningConfiguration = { status: 'Enabled' };
  cfnBucket.lifecycleConfiguration = {
    rules: [{
      id: 'expire-old-versions',
      status: 'Enabled',
      noncurrentVersionExpiration: { noncurrentDays: 30 },
    }],
  };
}
