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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

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
const followTable      = backend.data.resources.tables['UserFollowedAuthor'];

// ── increment-listens ─────────────────────────────────────────────────────
const incrementListensFn = backend.incrementListens.resources.lambda as lambda.Function;
incrementListensFn.addEnvironment('STORY_TABLE_NAME', storyTable.tableName);
storyTable.grantReadWriteData(incrementListensFn);

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
}));
