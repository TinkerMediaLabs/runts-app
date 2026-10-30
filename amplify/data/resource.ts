import { incrementListens } from '../functions/increment-listens/resource';
import { eroticPin } from '../functions/erotic-pin/resource';
import { uploadUrl } from '../functions/upload-url/resource';
import { deleteAccount } from '../functions/delete-account/resource';
import { audioLinks } from '../functions/audio-links/resource';
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
      preferredTagIds: a.string().array(),   // up to 3 genres picked at onboarding; seeds Home
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
      totalListenSeconds: a.integer(),
      totalStoriesFinished: a.integer(), 
      followedAuthorCount: a.integer(),   // maintained by follow-count-aggregator (stream on UserFollowedAuthor)
      bookmarks: a.hasMany('UserBookmark', 'userId'),
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
    .secondaryIndexes(index => [
      index('userId').sortKeys(['sortOrder']).name('byUserIdAndSortOrder'),
      index('userId').sortKeys(['storyId']).name('byUserAndStory'),
    ])
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
    .secondaryIndexes(index => [
      index('userId').sortKeys(['finishedAt']).name('byUserAndFinishedAt'),
      index('userId').sortKeys(['storyId']).name('byUserAndStory'),
    ])
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
    .secondaryIndexes(index => [
      index('userId').sortKeys(['lastListenedAt']).name('byUserAndLastListened'),
      index('userId').sortKeys(['storyId']).name('byUserAndStory'),
    ])
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
      index('userId').sortKeys(['rating']).name('byUserAndRating'),
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
    index('userId').sortKeys(['createdAt']).name('byUserAndCreatedAt'),   // account cleanup (user-cleanup)
  ])
  .authorization(allow => [
    allow.owner(),
    allow.authenticated().to(['read']),
    allow.group('admin').to(['read', 'delete']),   // moderation: remove reported comments from the CMS
  ]),

  // ── CommentReport ─────────────────────────────────────────────────────────
  // A listener reporting a comment. Keeps a snapshot of the comment so moderators can still see what
  // was reported after it is edited or deleted. userId is the reporter. Moderators list open reports
  // through byStatusAndCreatedAt (never a scan).
  CommentReport: a
    .model({
      userId: a.string().required(),           // reporter
      commentId: a.string().required(),
      storyId: a.string().required(),
      commentContent: a.string(),
      commentUserId: a.string(),
      commentUserName: a.string(),
      reason: a.string().required(),           // spam | harassment | inappropriate | other
      status: a.string().required(),           // open | reviewed
      createdAt: a.datetime(),
    })
    .secondaryIndexes(index => [
      index('status').sortKeys(['createdAt']).name('byStatusAndCreatedAt'),
      index('userId').sortKeys(['commentId']).name('byUserAndComment'),   // no duplicate reports; account cleanup
    ])
    .authorization(allow => [
      allow.owner().to(['create', 'read']),
      allow.group('admin').to(['read', 'update', 'delete']),
    ]),

  // ── UserBlock ─────────────────────────────────────────────────────────────
  // A listener hiding another listener's comments. userId is the blocker.
  UserBlock: a
    .model({
      userId: a.string().required(),
      blockedUserId: a.string().required(),
      blockedUserName: a.string(),
      createdAt: a.datetime(),
    })
    .secondaryIndexes(index => [
      index('userId').sortKeys(['blockedUserId']).name('byUserAndBlocked'),
    ])
    .authorization(allow => [allow.owner()]),

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
    .secondaryIndexes(index => [
      index('userId').sortKeys(['favoritedAt']).name('byUserAndFavoritedAt'),
      index('userId').sortKeys(['storyId']).name('byUserAndStory'),
    ])
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
      index('authorId').name('byAuthorId'),   // followers of an author (notify-new-story)
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
      nameLower: a.string(),   // lowercase name — sort key for byName index
      searchPk: a.string(),    // constant 'ALL' — partition key for byName index
      profilePicUri: a.string(),
      bio: a.string(),
      publisherId: a.string(),
      primaryGenres: a.string().array(),   // ← add this — array of tag IDs
      publisher: a.belongsTo('Publisher', 'publisherId'),
      stories: a.hasMany('Story', 'authorId'),
    })
    .secondaryIndexes(index => [
      index('searchPk').sortKeys(['nameLower']).name('byName'),
    ])
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

      // ── Narrator ──────────────────────────────────────────────────────────────
  Narrator: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      nameLower: a.string(),   // lowercase name — sort key for byName index
      searchPk: a.string(),    // constant 'ALL' — partition key for byName index
      profilePicUri: a.string(),
      bio: a.string(),
      stories: a.hasMany('StoryNarrator', 'narratorId'),
    })
    .secondaryIndexes(index => [
      index('searchPk').sortKeys(['nameLower']).name('byName'),
    ])
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
      licenseType: a.string(),    // 'public_domain' | 'runts_exclusive' | 'licensed' | 'other'
      isPremium:   a.boolean().default(false),
      title: a.string().required(),
      titleLower: a.string(),   // lowercase title — sort key for title-prefix search
      liveTagId: a.string(),    // = primaryTagId while live==='true', otherwise absent (sparse). Maintained by tag-index-sync.
      narratorNames: a.string().array(),   // denormalized by the CMS on save (no join at read time)
      audioUri: a.string(),
      summary: a.string(),
      description: a.string(),
      credit: a.string(),
      imageUri: a.string(),
      duration: a.integer(),
      numListens: a.integer(),
      nsfw: a.string(),
      live: a.string(),
      isErotic: a.string().default('false'),
      transcript: a.string(),
      spiceRating: a.integer(),
      publishedAt: a.string(),
      publishedYear: a.integer(), 
      // Aggregates — written by Lambdas, read by app
      avgRating: a.float(),
      numRatings: a.integer(),
      numComments: a.integer(),
      // Foreign keys
      authorId: a.string(),
      publisherId: a.string(),
      primaryTagId: a.string(),
      secondaryTagId: a.string(),
      storyFormat: a.enum(['SHORT_STORY', 'NOVELLA', 'FLASH_FICTION']),
      sequenceNumber: a.integer(),
      sceneCount: a.integer(),   // picture-book scenes; set by the CMS. App only queries StoryScene when > 0.
      universeId: a.string(),
      pov: a.enum(['THIRD_PERSON', 'SECOND_PERSON', 'FIRST_PERSON', 'MULTIPLE_POV']),
      narrationType: a.enum(['AI', 'HUMAN', 'MIXED']),
      contentWarnings: a.string().array(),
      tone: a.enum([
        'FUNNY', 'DARK', 'SUSPENSEFUL', 'WHIMSICAL', 'ROMANTIC',
        'EERIE', 'THOUGHT_PROVOKING', 'HOPEFUL', 'MELANCHOLIC', 'ADVENTUROUS',
      ]),
      // Relations
      author: a.belongsTo('Author', 'authorId'),
      universe: a.belongsTo('Universe', 'universeId'),
      narrators: a.hasMany('StoryNarrator', 'storyId'),
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
      bookmarks: a.hasMany('UserBookmark', 'storyId'),
      scenes: a.hasMany('StoryScene', 'storyId'),
    })
    .secondaryIndexes(index => [
      index('live').sortKeys(['publishedAt']).name('byLiveAndPublishedAt'),
      index('live').sortKeys(['numListens']).name('byLiveAndListens'),
      index('live').sortKeys(['duration']).name('byLiveAndDuration'),
      index('live').sortKeys(['titleLower']).name('byLiveAndTitle'),
      index('isErotic').sortKeys(['publishedAt']).name('byEroticAndPublishedAt'),
      index('liveTagId').sortKeys(['publishedAt']).name('byLiveTagAndPublishedAt'),
      index('liveTagId').sortKeys(['numListens']).name('byLiveTagAndListens'),
      index('liveTagId').sortKeys(['duration']).name('byLiveTagAndDuration'),
      index('authorId').sortKeys(['publishedAt']).name('byAuthorAndPublishedAt'),
      index('universeId').sortKeys(['publishedAt']).name('byUniverseAndPublishedAt'),
    ])
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

  // ── StoryStats ────────────────────────────────────────────────────────────
  // Single row (id 'GLOBAL') maintained by story-stats-aggregator; CMS reads it for chip counts.
  StoryStats: a
    .model({
      id: a.id().required(),
      live: a.integer().default(0),
      draft: a.integer().default(0),
      erotic: a.integer().default(0),
    })
    .authorization(allow => [
      allow.group('admin').to(['read']),
    ]),

  // ── StoryListenBuffer ─────────────────────────────────────────────────────
  // One row per story (id = storyId). increment-listens bumps `count`; listens-aggregator folds the
  // stream into Story.numListens in batches so plays never write the Story row directly.
  StoryListenBuffer: a
    .model({
      id: a.id().required(),
      count: a.integer().default(0),
    })
    .authorization(allow => [
      allow.group('admin').to(['read']),
    ]),

  // ── EroticPin ─────────────────────────────────────────────────────────────
  // id = userId. Holds the salted PIN hash and the wrong-guess counter for the account-level erotic
  // content PIN. Only the erotic-pin Lambda reads or writes it (raw DynamoDB); no app user can.
  EroticPin: a
    .model({
      id: a.id().required(),
      hash: a.string(),
      salt: a.string(),
      failedAttempts: a.integer(),
      lockedUntil: a.integer(),
      updatedAt: a.integer(),
    })
    .authorization(allow => [
      allow.group('admin').to(['read']),
    ]),

  EroticPinResult: a.customType({
    ok: a.boolean().required(),
    pinSet: a.boolean().required(),
    error: a.string(),
    attemptsLeft: a.integer(),
    lockedUntil: a.integer(),
  }),

  // ── ListenDedupe ──────────────────────────────────────────────────────────
  // id = `${userId}#${storyId}`; expiresAt (epoch seconds) is the table TTL attribute. Limits a
  // user to one counted listen per story per hour.
  ListenDedupe: a
    .model({
      id: a.id().required(),
      expiresAt: a.integer(),
    })
    .authorization(allow => [
      allow.group('admin').to(['read']),
    ]),

  // ── Tag ───────────────────────────────────────────────────────────────────
  Tag: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      nameLower: a.string(),
      searchPk: a.string(),     // 'REGULAR' | 'EROTIC' (partition per erotic flag)
      primaryFlag: a.string(),  // 'true' | 'false' mirror of isPrimary (index keys must be strings)
      isPrimary: a.boolean(),
      isPremiumGenre: a.boolean().default(false),
      storyCount: a.integer().default(0),
      color: a.string(),
      icon: a.string(),
      imageUri: a.string(),
      tileImageUri: a.string(),
      heroImageUri: a.string(),
      description: a.string(),
      useHeroLayout: a.boolean().default(false),
      isErotic: a.boolean().default(false),
      // What kind of tag this is, beyond genre. Absent = ordinary genre tag. First value: 'setting'
      // (where a story takes place). No index yet: adding a GSI makes Amplify delete and recreate the table
      // (all rows lost), so an index here needs a backup-and-restore plan first (see handoff section 36).
      tagType: a.string(),
      stories: a.hasMany('StoryTag', 'tagId'),
      
    })
    .secondaryIndexes(index => [
      index('searchPk').sortKeys(['nameLower']).name('byName'),
      index('primaryFlag').sortKeys(['nameLower']).name('byPrimaryAndName'),
    ])
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

      // ── Universe ──────────────────────────────────────────────────────────────
  Universe: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      nameLower: a.string(),   // lowercase name — sort key for byName index
      searchPk: a.string(),    // constant 'ALL' — partition key for byName index
      stories: a.hasMany('Story', 'universeId'),
    })
    .secondaryIndexes(index => [
      index('searchPk').sortKeys(['nameLower']).name('byName'),
    ])
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

    // ── UserBookmark ──────────────────────────────────────────────────────────
  UserBookmark: a
    .model({
      userId:          a.string().required(),
      storyId:         a.string().required(),
      positionSeconds: a.integer().required(),
      name:            a.string(),
      createdAt:       a.datetime(),
      story: a.belongsTo('Story', 'storyId'),
      user:  a.belongsTo('User',  'userId'),
    })
    .secondaryIndexes(index => [
      index('userId').sortKeys(['createdAt']).name('byUserAndCreatedAt'),
    ])
    .authorization(allow => [allow.owner()]),


  // ── User Device ────────────────────────────────
  UserDevice: a.model({
    userId:    a.string().required(),
    pushToken: a.string().required(),
    platform:  a.string().required(),  // 'ios' | 'android'
    updatedAt: a.datetime(),
  })
  .secondaryIndexes(index => [
    index('userId').name('byUserId'),
  ])
  .authorization(allow => [
      allow.owner(),
  ]),

    // ── StoryNarrator (join table for many-to-many) ────────────────────────────
  StoryNarrator: a
    .model({
      storyId: a.string().required(),
      narratorId: a.string().required(),
      story: a.belongsTo('Story', 'storyId'),
      narrator: a.belongsTo('Narrator', 'narratorId'),
    })
    .secondaryIndexes(index => [
      index('storyId').name('byStoryId'),
      index('narratorId').name('byNarratorId'),
    ])
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

  // ── StoryScene (picture-book images that change at set points in the audio) ──
  // One query on byStoryAndStart returns a story's scenes in time order (CMS caps ~60 per story).
  // The current scene is derived from playback position: the last scene whose startSeconds <= position.
  StoryScene: a
    .model({
      storyId: a.string().required(),
      startSeconds: a.integer().required(),
      imageUri: a.string().required(),   // S3 key: stories/{storyId}/scenes/{n}.jpg
      altText: a.string(),
      story: a.belongsTo('Story', 'storyId'),
    })
    .secondaryIndexes(index => [
      index('storyId').sortKeys(['startSeconds']).name('byStoryAndStart'),
    ])
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

  // ── HomeSection: one list on the Home screen, edited in the CMS ────────────
  // The CMS decides WHICH lists appear, in what order, with what title and settings. What each type
  // does (the query behind it) lives in the app: forYou, continueListening, becauseYou, genres,
  // newStories, featuredAuthor, handPicked, trending. The app skips types it does not know.
  // A handful of rows (tens, never thousands); the index just keeps them ordered.
  HomeSection: a
    .model({
      layoutPk: a.string().required(),      // constant 'HOME' — partition key for byLayoutAndOrder
      type: a.string().required(),
      title: a.string(),                    // overrides the type's default title
      blurb: a.string(),                    // featuredAuthor: short line under the author's name
      sortOrder: a.integer().required(),    // lowest first
      enabled: a.boolean(),                 // false hides it (null counts as on)
      startsAt: a.datetime(),               // optional schedule; the app checks these when it loads the layout
      endsAt: a.datetime(),
      limit: a.integer(),                   // how many stories / rows to show
      authorId: a.string(),                 // featuredAuthor
      storyIds: a.string().array(),         // handPicked, in display order
      windowDays: a.integer(),              // trending: look at the last N days (2 to 7)
      tagIds: a.string().array(),           // tag home 'related genres': genres to pin first, in order
      hideTagIds: a.string().array(),       // tag home 'related genres': genres never to show
    })
    .secondaryIndexes(index => [
      index('layoutPk').sortKeys(['sortOrder']).name('byLayoutAndOrder'),
    ])
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

  // ── StoryListenDay ────────────────────────────────────────────────────────
  // Plays per story per UTC day (id = `${day}#${storyId}`, day = YYYY-MM-DD). listens-aggregator adds to it
  // in the same batches that update Story.numListens, so a play costs no extra write at play time.
  // trending-snapshot reads one day at a time (byDay) and deletes rows older than about a week.
  StoryListenDay: a
    .model({
      id: a.id().required(),
      day: a.string().required(),
      storyId: a.string().required(),
      count: a.integer().default(0),
    })
    .secondaryIndexes(index => [
      index('day').name('byDay'),
    ])
    .authorization(allow => [
      allow.group('admin').to(['read']),
    ]),

  // ── TrendingSnapshot ──────────────────────────────────────────────────────
  // One row per window: id = 'd2' ... 'd7' (the last N days). The top stories with their play counts,
  // rewritten hourly by trending-snapshot. The app reads one row, so Trending costs the same at any scale.
  TrendingSnapshot: a
    .model({
      id: a.id().required(),
      windowDays: a.integer(),
      storyIds: a.string().array(),
      counts: a.integer().array(),
      computedAt: a.string(),
    })
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['read']),
    ]),

  // ── TagInsight ────────────────────────────────────────────────────────────
  // One row per tag (id = tagId), written by two scheduled jobs and only read by the app:
  //  - tag-insights (every few hours): liveCount, related genres with how many live stories they share,
  //    and the newest stories shared with the top few related genres (sharedJson = {tagId: [storyIds]}).
  //  - trending-snapshot (hourly): this tag's most-played stories of the last 7 days.
  // The Tag Home screen reads this single row to decide its size-based layout and its related-genre rows.
  TagInsight: a
    .model({
      id: a.id().required(),
      liveCount: a.integer(),
      relatedTagIds: a.string().array(),
      relatedCounts: a.integer().array(),
      sharedJson: a.string(),
      computedAt: a.string(),
      trendingStoryIds: a.string().array(),
      trendingCounts: a.integer().array(),
      trendingAt: a.string(),
      // Discover lists. A copy of the genre's name, and `listFlag` = 'REGULAR' only for subgenres (not primary, not
      // erotic) that have at least one live story, so the three indexes below hold nothing else (sparse).
      // listens7 = plays of the genre's stories in the last 7 days (kept by the hourly trending job).
      name: a.string(),
      nameLower: a.string(),
      listFlag: a.string(),
      listens7: a.integer(),
      listens7At: a.string(),
    })
    .secondaryIndexes(index => [
      index('listFlag').sortKeys(['nameLower']).name('byListName'),
      index('listFlag').sortKeys(['listens7']).name('byListListens'),
      index('listFlag').sortKeys(['liveCount']).name('byListCount'),
    ])
    .authorization(allow => [
      allow.authenticated().to(['read']),
      allow.group('admin').to(['read']),
    ]),

  // ── StoryTag (join table for many-to-many) ────────────────────────────────
  StoryTag: a
    .model({
      storyId: a.string().required(),
      tagId: a.string().required(),
      liveTagId: a.string(),      // = tagId while the story is live, otherwise absent (sparse). Maintained by tag-index-sync.
      publishedAt: a.datetime(),  // copy of Story.publishedAt (sort key for the live-tag index)
      story: a.belongsTo('Story', 'storyId'),
      tag: a.belongsTo('Tag', 'tagId'),
    })
    .secondaryIndexes(index => [
      index('storyId').name('byStoryId'),
      index('tagId').name('byTagId'),
      index('liveTagId').sortKeys(['publishedAt']).name('byLiveTagAndPublishedAt'),
    ])
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
  manageEroticPin: a
    .mutation()
    .arguments({
      action: a.string().required(),   // 'status' | 'verify' | 'set' | 'remove'
      pin: a.string(),
      newPin: a.string(),
    })
    .returns(a.ref('EroticPinResult'))
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(eroticPin)),
  // CMS uploads go through a short-lived link only admins can request (see functions/upload-url).
  getUploadUrl: a
    .mutation()
    .arguments({
      key: a.string().required(),
      contentType: a.string().required(),
    })
    .returns(a.string())
    .authorization(allow => [allow.group('admin')])
    .handler(a.handler.function(uploadUrl)),
  // Signed 7-day CDN links for story audio (see functions/audio-links). Returns JSON: { expiresAt, links: [{ path, url }] }.
  getAudioLinks: a
    .mutation()
    .arguments({ paths: a.string().array().required() })
    .returns(a.string())
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(audioLinks)),
  // The signed-in user deletes their own account: profile data first, then the sign-in account (see functions/delete-account).
  deleteMyAccount: a
    .mutation()
    .returns(a.boolean())
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(deleteAccount)),
});






export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});