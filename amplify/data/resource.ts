import { incrementListens } from '../functions/increment-listens/resource';
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({

  // ── User ──────────────────────────────────────────────────────────────────
  User: a
    .model({
      id: a.id().required(),
      type: a.string(),
      name: a.string(),
      profilePicUri: a.string(),
      birthdate: a.date(),
      isPublisher: a.boolean(),
      plan: a.string(),
      onboardingComplete: a.boolean(),
      // Story connections
      pinnedStories: a.hasMany('UserPinnedStory', 'userId'),
      finishedStories: a.hasMany('UserFinishedStory', 'userId'),
      inProgressStories: a.hasMany('UserInProgressStory', 'userId'),
      // New connections
      ratings: a.hasMany('UserRating', 'userId'),
      reactions: a.hasMany('UserReaction', 'userId'),
      comments: a.hasMany('Comment', 'userId'),
      favoritedStories: a.hasMany('UserFavoritedStory', 'userId'),
      followedAuthors: a.hasMany('UserFollowedAuthor', 'userId'),
    })
    .authorization(allow => [allow.owner()]),

  // ── UserPinnedStory (join table) ──────────────────────────────────────────
  UserPinnedStory: a
    .model({
      userId: a.string().required(),
      storyId: a.string().required(),
      pinnedAt: a.datetime(),
      sortOrder: a.integer(),
      story: a.belongsTo('Story', 'storyId'),
      user: a.belongsTo('User', 'userId'),
    })
    .authorization(allow => [allow.owner()]),

  // ── UserFinishedStory (join table) ────────────────────────────────────────
  UserFinishedStory: a
    .model({
      userId: a.string().required(),
      storyId: a.string().required(),
      finishedAt: a.datetime(),
      story: a.belongsTo('Story', 'storyId'),
      user: a.belongsTo('User', 'userId'),
    })
    .authorization(allow => [allow.owner()]),

  // ── UserInProgressStory (join table) ──────────────────────────────────────
  UserInProgressStory: a
    .model({
      userId: a.string().required(),
      storyId: a.string().required(),
      progressSeconds: a.integer(),
      lastListenedAt: a.datetime(),
      story: a.belongsTo('Story', 'storyId'),
      user: a.belongsTo('User', 'userId'),
    })
    .authorization(allow => [allow.owner()]),

  // ── UserRating ────────────────────────────────────────────────────────────
  // One record per user per story (upsert pattern). Lambda aggregates into
  // Story.avgRating and Story.numRatings via DynamoDB stream.
  // Ratings >= 8 trigger auto-add to UserFavoritedStory.
  UserRating: a
    .model({
      userId: a.string().required(),
      storyId: a.string().required(),
      rating: a.integer().required(),    // 1–10
      story: a.belongsTo('Story', 'storyId'),
      user: a.belongsTo('User', 'userId'),
    })
    .secondaryIndexes(index => [
      // Look up "has this user rated this story?" in O(1)
      index('userId').sortKeys(['storyId']).name('byUserAndStory'),
    ])
    .authorization(allow => [
      allow.owner(),
      allow.authenticated().to(['read']),
    ]),

  // ── UserReaction ──────────────────────────────────────────────────────────
  // One record per user per story (upsert pattern). Lambda aggregates into
  // StoryReactionCount via DynamoDB stream. Handles MODIFY (reaction change)
  // by decrementing old type and incrementing new type.
  UserReaction: a
    .model({
      userId: a.string().required(),
      storyId: a.string().required(),
      // One of: shocked | frustrated | sad | reflective | touched | amused |
      //         scared | bored | uninterested | thrilled | confused | tense
      reaction: a.string().required(),
      story: a.belongsTo('Story', 'storyId'),
      user: a.belongsTo('User', 'userId'),
    })
    .secondaryIndexes(index => [
      // Look up "has this user reacted to this story?" in O(1)
      index('userId').sortKeys(['storyId']).name('byUserAndStory'),
    ])
    .authorization(allow => [
      allow.owner(),
      allow.authenticated().to(['read']),
    ]),

  // ── Comment ───────────────────────────────────────────────────────────────
  // Users can add, edit, and delete their own comments.
  // Lambda increments/decrements Story.numComments via DynamoDB stream.
  // Max 500 chars enforced in UI.
Comment: a
  .model({
    userId: a.string().required(),
    storyId: a.string().required(),
    content: a.string().required(),
    userName: a.string(),              // ← add this
    createdAt: a.datetime(),
    story: a.belongsTo('Story', 'storyId'),
    user: a.belongsTo('User', 'userId'),
  })
  .secondaryIndexes(index => [
    index('storyId').sortKeys(['createdAt']).name('byStoryAndCreatedAt'),
  ])
  .authorization(allow => [
    allow.owner(),
    allow.authenticated().to(['read']),
  ]),

  // ── UserFavoritedStory ────────────────────────────────────────────────────
  // Auto-populated by rating-aggregator Lambda when rating >= 8.
  // Auto-removed when rating is updated to < 8.
  // Powers the Favorites tab in playlist.tsx.
  UserFavoritedStory: a
    .model({
      userId: a.string().required(),
      storyId: a.string().required(),
      favoritedAt: a.datetime(),
      story: a.belongsTo('Story', 'storyId'),
      user: a.belongsTo('User', 'userId'),
    })
    .authorization(allow => [allow.owner()]),

  // ── UserFollowedAuthor ────────────────────────────────────────────────────
  UserFollowedAuthor: a
    .model({
      userId: a.string().required(),
      authorId: a.string().required(),
      followedAt: a.datetime(),
      user: a.belongsTo('User', 'userId'),
    })
    .secondaryIndexes(index => [
      index('userId').sortKeys(['authorId']).name('byUserAndAuthor'),
      index('userId').sortKeys(['followedAt']).name('byUserAndFollowedAt'),  // ← add
    ])
    .authorization(allow => [allow.owner()]),

  // ── StoryReactionCount ────────────────────────────────────────────────────
  // One record per storyId + reactionType. Written exclusively by
  // reaction-aggregator Lambda via DynamoDB SDK (atomic ADD). Read by app
  // via AppSync to display top 4 reactions on story detail screen.
  StoryReactionCount: a
    .model({
      storyId: a.string().required(),
      reactionType: a.string().required(),
      count: a.integer(),
    })
    .secondaryIndexes(index => [
      // Fetch top 4 reactions for a story sorted by count DESC
      index('storyId').sortKeys(['count']).name('byStoryAndCount'),
    ])
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

  // ── Publisher ─────────────────────────────────────────────────────────────
  Publisher: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      bio: a.string(),
      profilePicUri: a.string(),
      website: a.string(),
      numPublished: a.integer(),
      authors: a.hasMany('Author', 'publisherId'),
      stories: a.hasMany('Story', 'publisherId'),
    })
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

  // ── Author ────────────────────────────────────────────────────────────────
  Author: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      profilePicUri: a.string(),
      bio: a.string(),
      publisherId: a.string(),
      primaryGenres: a.string().array(),   // ← add this — array of tag IDs
      publisher: a.belongsTo('Publisher', 'publisherId'),
      stories: a.hasMany('Story', 'authorId'),
    })
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

  // ── Story ─────────────────────────────────────────────────────────────────
  // CHANGED: added avgRating, numRatings, numComments (all optional — safe
  // to add to existing DynamoDB table, existing items unaffected).
  Story: a
    .model({
      id: a.id().required(),
      type: a.string(),
      title: a.string().required(),
      audioUri: a.string(),
      summary: a.string(),
      description: a.string(),
      credit: a.string(),
      imageUri: a.string(),
      duration: a.integer(),
      numListens: a.integer(),
      nsfw: a.string(),
      live: a.string(),
      transcript: a.string(),
      publishedAt: a.string(),
      // Aggregates — written by Lambdas, read by app
      avgRating: a.float(),
      numRatings: a.integer(),
      numComments: a.integer(),
      // Foreign keys
      authorId: a.string(),
      publisherId: a.string(),
      primaryTagId: a.string(),
      secondaryTagId: a.string(),
      // Relations
      author: a.belongsTo('Author', 'authorId'),
      publisher: a.belongsTo('Publisher', 'publisherId'),
      tags: a.hasMany('StoryTag', 'storyId'),
      pinnedBy: a.hasMany('UserPinnedStory', 'storyId'),
      finishedBy: a.hasMany('UserFinishedStory', 'storyId'),
      inProgressBy: a.hasMany('UserInProgressStory', 'storyId'),
      // New relations
      ratings: a.hasMany('UserRating', 'storyId'),
      reactions: a.hasMany('UserReaction', 'storyId'),
      comments: a.hasMany('Comment', 'storyId'),
      favoritedBy: a.hasMany('UserFavoritedStory', 'storyId'),
    })
    .secondaryIndexes(index => [
      index('live').sortKeys(['publishedAt']).name('byLiveAndPublishedAt'),
      index('live').sortKeys(['numListens']).name('byLiveAndListens'),
      index('primaryTagId').sortKeys(['publishedAt']).name('byTagAndPublishedAt'),
      index('primaryTagId').sortKeys(['numListens']).name('byTagAndListens'),
      index('primaryTagId').sortKeys(['duration']).name('byTagAndDuration'),
      index('authorId').sortKeys(['publishedAt']).name('byAuthorAndPublishedAt'),
    ])
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

  // ── Tag ───────────────────────────────────────────────────────────────────
  Tag: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      isPrimary: a.boolean(),
      color: a.string(),
      icon: a.string(),
      imageUri: a.string(),
      tileImageUri: a.string(),
      stories: a.hasMany('StoryTag', 'tagId'),
    })
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

  // ── StoryTag (join table for many-to-many) ────────────────────────────────
  StoryTag: a
    .model({
      storyId: a.string().required(),
      tagId: a.string().required(),
      story: a.belongsTo('Story', 'storyId'),
      tag: a.belongsTo('Tag', 'tagId'),
    })
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),
  incrementListenCount: a
    .mutation()
    .arguments({ storyId: a.string().required() })
    .returns(a.boolean())
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(incrementListens)),
});


export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});