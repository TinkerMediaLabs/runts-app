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

  // ── Publisher ─────────────────────────────────────────────────────────────
  Publisher: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      bio: a.string(),
      profilePicUri: a.string(),
      website: a.string(),
      numPublished: a.integer(),
      // Relations
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
      // Relations
      publisher: a.belongsTo('Publisher', 'publisherId'),
      stories: a.hasMany('Story', 'authorId'),
    })
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

  // ── Story ─────────────────────────────────────────────────────────────────
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
      publishedAt: a.string(), // ISO datetime string for sorting by newest
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

});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});