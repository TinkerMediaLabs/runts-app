import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { incrementListens } from './functions/increment-listens/resource';
import { ratingAggregator } from './functions/rating-aggregator/resource';
import { reactionAggregator } from './functions/reaction-aggregator/resource';
import { commentCounter } from './functions/comment-counter/resource';
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
});

const storyTable         = backend.data.resources.tables['Story'];
const ratingTable        = backend.data.resources.tables['UserRating'];
const reactionTable      = backend.data.resources.tables['UserReaction'];
const commentTable       = backend.data.resources.tables['Comment'];
const faveTable          = backend.data.resources.tables['UserFavoritedStory'];
const reactionCountTable = backend.data.resources.tables['StoryReactionCount'];

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