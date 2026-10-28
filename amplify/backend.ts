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
import { dataHealth } from './functions/data-health/resource';
import { deleteAccount } from './functions/delete-account/resource';
import { appleVerifyChallenge } from './functions/apple-auth/verify-challenge/resource';
import { applePreSignUp } from './functions/apple-auth/pre-signup/resource';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource, SqsDlq } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';

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
  dataHealth,
  deleteAccount,
  appleVerifyChallenge,
  applePreSignUp,
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
  resources: [`${listenDayTable.tableArn}/index/*`, `${tagInsightTable.tableArn}/index/*`],
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

// ── delete-account ────────────────────────────────────────────────────────
// The signed-in user deletes their own account: the User row (which fires user-cleanup below), then the Cognito user.
const deleteAccountFn = backend.deleteAccount.resources.lambda as lambda.Function;
deleteAccountFn.addEnvironment('USER_TABLE_NAME', userTable.tableName);
deleteAccountFn.addEnvironment('USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
userTable.grantWriteData(deleteAccountFn);
deleteAccountFn.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cognito-idp:AdminDeleteUser'],
  resources: [backend.auth.resources.userPool.userPoolArn],
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


// ── monitoring ────────────────────────────────────────────────────────────
// One alerts topic per environment. Nothing is subscribed in code (so no address lives in the repo):
// subscribe once per environment with `aws sns subscribe` (see handoff, "Monitoring").
// The topic sits in its own stack so data-health (in the data stack) can publish to it while the alarms
// stack, which watches every function, depends on both without a circular reference.
const alertsStack = backend.createStack('AlertsTopic');
const alertsTopic = new sns.Topic(alertsStack, 'AlertsTopic', { displayName: 'Runts alerts' });

const dataHealthFn = backend.dataHealth.resources.lambda as lambda.Function;
dataHealthFn.addEnvironment('STORY_TABLE_NAME', storyTable.tableName);
dataHealthFn.addEnvironment('STORYTAG_TABLE_NAME', storyTagTable.tableName);
dataHealthFn.addEnvironment('TRENDING_TABLE_NAME', trendingTable.tableName);
dataHealthFn.addEnvironment('ALERT_TOPIC_ARN', alertsTopic.topicArn);
storyTable.grantReadWriteData(dataHealthFn);
storyTagTable.grantReadWriteData(dataHealthFn);
trendingTable.grantReadData(dataHealthFn);
alertsTopic.grantPublish(dataHealthFn);

const alarmsStack = backend.createStack('Alarms');
const alarmAction = new SnsAction(alertsTopic);
const watch = (alarm: cloudwatch.Alarm) => { alarm.addAlarmAction(alarmAction); return alarm; };

// Any error in any function.
const allFunctions: Record<string, lambda.Function> = {
  incrementListens: backend.incrementListens.resources.lambda as lambda.Function,
  ratingAggregator: backend.ratingAggregator.resources.lambda as lambda.Function,
  reactionAggregator: backend.reactionAggregator.resources.lambda as lambda.Function,
  commentCounter: backend.commentCounter.resources.lambda as lambda.Function,
  tagCountAggregator: backend.tagCountAggregator.resources.lambda as lambda.Function,
  storyStatsAggregator: backend.storyStatsAggregator.resources.lambda as lambda.Function,
  followCountAggregator: backend.followCountAggregator.resources.lambda as lambda.Function,
  tagIndexSync: backend.tagIndexSync.resources.lambda as lambda.Function,
  listensAggregator: backend.listensAggregator.resources.lambda as lambda.Function,
  userCleanup: backend.userCleanup.resources.lambda as lambda.Function,
  eroticPin: backend.eroticPin.resources.lambda as lambda.Function,
  uploadUrl: backend.uploadUrl.resources.lambda as lambda.Function,
  trendingSnapshot: backend.trendingSnapshot.resources.lambda as lambda.Function,
  tagInsights: backend.tagInsights.resources.lambda as lambda.Function,
  dataHealth: dataHealthFn,
  deleteAccount: backend.deleteAccount.resources.lambda as lambda.Function,
};
for (const [name, fn] of Object.entries(allFunctions)) {
  watch(new cloudwatch.Alarm(alarmsStack, `${name}Errors`, {
    alarmDescription: `${name} threw errors`,
    metric: fn.metricErrors({ period: Duration.minutes(5), statistic: 'Sum' }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  }));
}

// Scheduled jobs that stop running (a silent failure no error alarm would catch).
const scheduled: Array<[string, lambda.Function, Duration, number]> = [
  ['trendingSnapshot', allFunctions.trendingSnapshot, Duration.hours(3), 1],   // runs hourly
  ['tagInsights', allFunctions.tagInsights, Duration.hours(6), 1],             // runs every 3h
  ['dataHealth', allFunctions.dataHealth, Duration.days(1), 2],                // runs daily
];
for (const [name, fn, period, periods] of scheduled) {
  watch(new cloudwatch.Alarm(alarmsStack, `${name}Missed`, {
    alarmDescription: `${name} has not run on schedule`,
    metric: fn.metricInvocations({ period, statistic: 'Sum' }),
    threshold: 1,
    evaluationPeriods: periods,
    comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.BREACHING,
  }));
}

// Stream records that exhausted their retries.
watch(new cloudwatch.Alarm(alarmsStack, 'StreamFailureQueueNotEmpty', {
  alarmDescription: 'Stream records landed in the failure queue (aggregators may be drifting)',
  metric: streamFailureQueue.metricApproximateNumberOfMessagesVisible({ period: Duration.minutes(5), statistic: 'Maximum' }),
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
}));

// DynamoDB throttling on the tables every screen depends on.
const throttleTables: Record<string, { tableName: string }> = {
  Story: storyTable, StoryTag: storyTagTable, StoryListenDay: listenDayTable, TagInsight: tagInsightTable, TrendingSnapshot: trendingTable,
};
for (const [name, table] of Object.entries(throttleTables)) {
  for (const kind of ['ReadThrottleEvents', 'WriteThrottleEvents']) {
    watch(new cloudwatch.Alarm(alarmsStack, `${name}${kind}`, {
      alarmDescription: `${name} is being throttled (${kind})`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB', metricName: kind, dimensionsMap: { TableName: table.tableName },
        statistic: 'Sum', period: Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }));
  }
}

// The API itself failing.
watch(new cloudwatch.Alarm(alarmsStack, 'AppSyncServerErrors', {
  alarmDescription: 'AppSync is returning server errors',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/AppSync', metricName: '5XXError', dimensionsMap: { GraphQLAPIId: backend.data.resources.graphqlApi.apiId },
    statistic: 'Sum', period: Duration.minutes(5),
  }),
  threshold: 5,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
}));

// ── Sign in with Apple: token table ───────────────────────────────────────
// One row per user holding Apple's refresh token (so it can be revoked on account deletion), plus short-lived
// "nonce used" rows that stop a sign-in being replayed. Deliberately NOT in the data schema: the app can never
// read it, only the sign-in and delete functions. Own stack so it never depends on auth or data (no cycles).
const appleStack = backend.createStack('AppleSignIn');
const isProduction = process.env.AWS_BRANCH === 'production';
const appleTable = new dynamodb.Table(appleStack, 'AppleTokens', {
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'ttl',
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: isProduction },
  removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
});
backend.appleVerifyChallenge.addEnvironment('APPLE_TABLE_NAME', appleTable.tableName);
appleTable.grantReadWriteData(backend.appleVerifyChallenge.resources.lambda);
// The sign-up check looks users up by email and links a Google sign-in to an existing account. It can only name the
// pool by wildcard here (the pool depends on this function), so it is limited to these two calls in this account.
const preSignUpStack = Stack.of(backend.applePreSignUp.resources.lambda);
backend.applePreSignUp.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminLinkProviderForUser', 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword'],
  resources: [`arn:aws:cognito-idp:${preSignUpStack.region}:${preSignUpStack.account}:userpool/*`],
}));
// Account deletion reads the stored Apple token and revokes it.
backend.deleteAccount.addEnvironment('APPLE_TABLE_NAME', appleTable.tableName);
appleTable.grantReadWriteData(backend.deleteAccount.resources.lambda);
