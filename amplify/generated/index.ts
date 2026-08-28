import { ModelInit, MutableModel, PersistentModelConstructor } from "@aws-amplify/datastore";
import { initSchema } from "@aws-amplify/datastore";

import { schema } from "./schema";



type EagerUserModel = {
  readonly [__modelMeta__]: {
    identifier: OptionallyManagedIdentifier<User, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly type?: string | null;
  readonly name?: string | null;
  readonly profilePicUri?: string | null;
  readonly birthdate?: string | null;
  readonly isPublisher?: boolean | null;
  readonly plan?: string | null;
  readonly onboardingComplete?: boolean | null;
  readonly pinnedStories?: (UserPinnedStoryModel | null)[] | null;
  readonly finishedStories?: (UserFinishedStoryModel | null)[] | null;
  readonly inProgressStories?: (UserInProgressStoryModel | null)[] | null;
  readonly ratings?: (UserRatingModel | null)[] | null;
  readonly reactions?: (UserReactionModel | null)[] | null;
  readonly comments?: (CommentModel | null)[] | null;
  readonly favoritedStories?: (UserFavoritedStoryModel | null)[] | null;
  readonly followedAuthors?: (UserFollowedAuthorModel | null)[] | null;
  readonly totalListenSeconds?: number | null;
  readonly totalStoriesFinished?: number | null;
  readonly bookmarks?: (UserBookmarkModel | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserModel = {
  readonly [__modelMeta__]: {
    identifier: OptionallyManagedIdentifier<User, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly type?: string | null;
  readonly name?: string | null;
  readonly profilePicUri?: string | null;
  readonly birthdate?: string | null;
  readonly isPublisher?: boolean | null;
  readonly plan?: string | null;
  readonly onboardingComplete?: boolean | null;
  readonly pinnedStories: AsyncCollection<UserPinnedStoryModel>;
  readonly finishedStories: AsyncCollection<UserFinishedStoryModel>;
  readonly inProgressStories: AsyncCollection<UserInProgressStoryModel>;
  readonly ratings: AsyncCollection<UserRatingModel>;
  readonly reactions: AsyncCollection<UserReactionModel>;
  readonly comments: AsyncCollection<CommentModel>;
  readonly favoritedStories: AsyncCollection<UserFavoritedStoryModel>;
  readonly followedAuthors: AsyncCollection<UserFollowedAuthorModel>;
  readonly totalListenSeconds?: number | null;
  readonly totalStoriesFinished?: number | null;
  readonly bookmarks: AsyncCollection<UserBookmarkModel>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserModel = LazyLoading extends LazyLoadingDisabled ? EagerUserModel : LazyUserModel

export declare const UserModel: (new (init: ModelInit<UserModel>) => UserModel) & {
  copyOf(source: UserModel, mutator: (draft: MutableModel<UserModel>) => MutableModel<UserModel> | void): UserModel;
}

type EagerUserPinnedStoryModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserPinnedStory, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly pinnedAt?: string | null;
  readonly sortOrder?: number | null;
  readonly story?: StoryModel | null;
  readonly user?: UserModel | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserPinnedStoryModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserPinnedStory, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly pinnedAt?: string | null;
  readonly sortOrder?: number | null;
  readonly story: AsyncItem<StoryModel | undefined>;
  readonly user: AsyncItem<UserModel | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserPinnedStoryModel = LazyLoading extends LazyLoadingDisabled ? EagerUserPinnedStoryModel : LazyUserPinnedStoryModel

export declare const UserPinnedStoryModel: (new (init: ModelInit<UserPinnedStoryModel>) => UserPinnedStoryModel) & {
  copyOf(source: UserPinnedStoryModel, mutator: (draft: MutableModel<UserPinnedStoryModel>) => MutableModel<UserPinnedStoryModel> | void): UserPinnedStoryModel;
}

type EagerUserFinishedStoryModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserFinishedStory, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly finishedAt?: string | null;
  readonly story?: StoryModel | null;
  readonly user?: UserModel | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserFinishedStoryModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserFinishedStory, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly finishedAt?: string | null;
  readonly story: AsyncItem<StoryModel | undefined>;
  readonly user: AsyncItem<UserModel | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserFinishedStoryModel = LazyLoading extends LazyLoadingDisabled ? EagerUserFinishedStoryModel : LazyUserFinishedStoryModel

export declare const UserFinishedStoryModel: (new (init: ModelInit<UserFinishedStoryModel>) => UserFinishedStoryModel) & {
  copyOf(source: UserFinishedStoryModel, mutator: (draft: MutableModel<UserFinishedStoryModel>) => MutableModel<UserFinishedStoryModel> | void): UserFinishedStoryModel;
}

type EagerUserInProgressStoryModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserInProgressStory, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly progressSeconds?: number | null;
  readonly lastListenedAt?: string | null;
  readonly story?: StoryModel | null;
  readonly user?: UserModel | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserInProgressStoryModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserInProgressStory, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly progressSeconds?: number | null;
  readonly lastListenedAt?: string | null;
  readonly story: AsyncItem<StoryModel | undefined>;
  readonly user: AsyncItem<UserModel | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserInProgressStoryModel = LazyLoading extends LazyLoadingDisabled ? EagerUserInProgressStoryModel : LazyUserInProgressStoryModel

export declare const UserInProgressStoryModel: (new (init: ModelInit<UserInProgressStoryModel>) => UserInProgressStoryModel) & {
  copyOf(source: UserInProgressStoryModel, mutator: (draft: MutableModel<UserInProgressStoryModel>) => MutableModel<UserInProgressStoryModel> | void): UserInProgressStoryModel;
}

type EagerUserRatingModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserRating, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly rating: number;
  readonly story?: StoryModel | null;
  readonly user?: UserModel | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserRatingModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserRating, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly rating: number;
  readonly story: AsyncItem<StoryModel | undefined>;
  readonly user: AsyncItem<UserModel | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserRatingModel = LazyLoading extends LazyLoadingDisabled ? EagerUserRatingModel : LazyUserRatingModel

export declare const UserRatingModel: (new (init: ModelInit<UserRatingModel>) => UserRatingModel) & {
  copyOf(source: UserRatingModel, mutator: (draft: MutableModel<UserRatingModel>) => MutableModel<UserRatingModel> | void): UserRatingModel;
}

type EagerUserReactionModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserReaction, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly reaction: string;
  readonly story?: StoryModel | null;
  readonly user?: UserModel | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserReactionModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserReaction, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly reaction: string;
  readonly story: AsyncItem<StoryModel | undefined>;
  readonly user: AsyncItem<UserModel | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserReactionModel = LazyLoading extends LazyLoadingDisabled ? EagerUserReactionModel : LazyUserReactionModel

export declare const UserReactionModel: (new (init: ModelInit<UserReactionModel>) => UserReactionModel) & {
  copyOf(source: UserReactionModel, mutator: (draft: MutableModel<UserReactionModel>) => MutableModel<UserReactionModel> | void): UserReactionModel;
}

type EagerCommentModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Comment, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly content: string;
  readonly userName?: string | null;
  readonly createdAt?: string | null;
  readonly story?: StoryModel | null;
  readonly user?: UserModel | null;
  readonly updatedAt?: string | null;
}

type LazyCommentModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Comment, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly content: string;
  readonly userName?: string | null;
  readonly createdAt?: string | null;
  readonly story: AsyncItem<StoryModel | undefined>;
  readonly user: AsyncItem<UserModel | undefined>;
  readonly updatedAt?: string | null;
}

export declare type CommentModel = LazyLoading extends LazyLoadingDisabled ? EagerCommentModel : LazyCommentModel

export declare const CommentModel: (new (init: ModelInit<CommentModel>) => CommentModel) & {
  copyOf(source: CommentModel, mutator: (draft: MutableModel<CommentModel>) => MutableModel<CommentModel> | void): CommentModel;
}

type EagerUserFavoritedStoryModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserFavoritedStory, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly favoritedAt?: string | null;
  readonly story?: StoryModel | null;
  readonly user?: UserModel | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserFavoritedStoryModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserFavoritedStory, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly favoritedAt?: string | null;
  readonly story: AsyncItem<StoryModel | undefined>;
  readonly user: AsyncItem<UserModel | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserFavoritedStoryModel = LazyLoading extends LazyLoadingDisabled ? EagerUserFavoritedStoryModel : LazyUserFavoritedStoryModel

export declare const UserFavoritedStoryModel: (new (init: ModelInit<UserFavoritedStoryModel>) => UserFavoritedStoryModel) & {
  copyOf(source: UserFavoritedStoryModel, mutator: (draft: MutableModel<UserFavoritedStoryModel>) => MutableModel<UserFavoritedStoryModel> | void): UserFavoritedStoryModel;
}

type EagerUserFollowedAuthorModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserFollowedAuthor, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly authorId: string;
  readonly followedAt?: string | null;
  readonly user?: UserModel | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserFollowedAuthorModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserFollowedAuthor, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly authorId: string;
  readonly followedAt?: string | null;
  readonly user: AsyncItem<UserModel | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserFollowedAuthorModel = LazyLoading extends LazyLoadingDisabled ? EagerUserFollowedAuthorModel : LazyUserFollowedAuthorModel

export declare const UserFollowedAuthorModel: (new (init: ModelInit<UserFollowedAuthorModel>) => UserFollowedAuthorModel) & {
  copyOf(source: UserFollowedAuthorModel, mutator: (draft: MutableModel<UserFollowedAuthorModel>) => MutableModel<UserFollowedAuthorModel> | void): UserFollowedAuthorModel;
}

type EagerStoryReactionCountModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<StoryReactionCount, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly storyId: string;
  readonly reactionType: string;
  readonly count?: number | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyStoryReactionCountModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<StoryReactionCount, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly storyId: string;
  readonly reactionType: string;
  readonly count?: number | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type StoryReactionCountModel = LazyLoading extends LazyLoadingDisabled ? EagerStoryReactionCountModel : LazyStoryReactionCountModel

export declare const StoryReactionCountModel: (new (init: ModelInit<StoryReactionCountModel>) => StoryReactionCountModel) & {
  copyOf(source: StoryReactionCountModel, mutator: (draft: MutableModel<StoryReactionCountModel>) => MutableModel<StoryReactionCountModel> | void): StoryReactionCountModel;
}

type EagerPublisherModel = {
  readonly [__modelMeta__]: {
    identifier: OptionallyManagedIdentifier<Publisher, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name: string;
  readonly bio?: string | null;
  readonly profilePicUri?: string | null;
  readonly website?: string | null;
  readonly numPublished?: number | null;
  readonly authors?: (AuthorModel | null)[] | null;
  readonly stories?: (StoryModel | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyPublisherModel = {
  readonly [__modelMeta__]: {
    identifier: OptionallyManagedIdentifier<Publisher, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name: string;
  readonly bio?: string | null;
  readonly profilePicUri?: string | null;
  readonly website?: string | null;
  readonly numPublished?: number | null;
  readonly authors: AsyncCollection<AuthorModel>;
  readonly stories: AsyncCollection<StoryModel>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type PublisherModel = LazyLoading extends LazyLoadingDisabled ? EagerPublisherModel : LazyPublisherModel

export declare const PublisherModel: (new (init: ModelInit<PublisherModel>) => PublisherModel) & {
  copyOf(source: PublisherModel, mutator: (draft: MutableModel<PublisherModel>) => MutableModel<PublisherModel> | void): PublisherModel;
}

type EagerAuthorModel = {
  readonly [__modelMeta__]: {
    identifier: OptionallyManagedIdentifier<Author, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name: string;
  readonly profilePicUri?: string | null;
  readonly bio?: string | null;
  readonly publisherId?: string | null;
  readonly primaryGenres?: (string | null)[] | null;
  readonly publisher?: PublisherModel | null;
  readonly stories?: (StoryModel | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyAuthorModel = {
  readonly [__modelMeta__]: {
    identifier: OptionallyManagedIdentifier<Author, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name: string;
  readonly profilePicUri?: string | null;
  readonly bio?: string | null;
  readonly publisherId?: string | null;
  readonly primaryGenres?: (string | null)[] | null;
  readonly publisher: AsyncItem<PublisherModel | undefined>;
  readonly stories: AsyncCollection<StoryModel>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type AuthorModel = LazyLoading extends LazyLoadingDisabled ? EagerAuthorModel : LazyAuthorModel

export declare const AuthorModel: (new (init: ModelInit<AuthorModel>) => AuthorModel) & {
  copyOf(source: AuthorModel, mutator: (draft: MutableModel<AuthorModel>) => MutableModel<AuthorModel> | void): AuthorModel;
}

type EagerStoryModel = {
  readonly [__modelMeta__]: {
    identifier: OptionallyManagedIdentifier<Story, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly type?: string | null;
  readonly title: string;
  readonly audioUri?: string | null;
  readonly summary?: string | null;
  readonly description?: string | null;
  readonly credit?: string | null;
  readonly imageUri?: string | null;
  readonly duration?: number | null;
  readonly numListens?: number | null;
  readonly nsfw?: string | null;
  readonly live?: string | null;
  readonly isErotic?: string | null;
  readonly transcript?: string | null;
  readonly publishedAt?: string | null;
  readonly publishedYear?: number | null;
  readonly avgRating?: number | null;
  readonly numRatings?: number | null;
  readonly numComments?: number | null;
  readonly authorId?: string | null;
  readonly publisherId?: string | null;
  readonly primaryTagId?: string | null;
  readonly secondaryTagId?: string | null;
  readonly author?: AuthorModel | null;
  readonly publisher?: PublisherModel | null;
  readonly tags?: (StoryTagModel | null)[] | null;
  readonly pinnedBy?: (UserPinnedStoryModel | null)[] | null;
  readonly finishedBy?: (UserFinishedStoryModel | null)[] | null;
  readonly inProgressBy?: (UserInProgressStoryModel | null)[] | null;
  readonly ratings?: (UserRatingModel | null)[] | null;
  readonly reactions?: (UserReactionModel | null)[] | null;
  readonly comments?: (CommentModel | null)[] | null;
  readonly favoritedBy?: (UserFavoritedStoryModel | null)[] | null;
  readonly bookmarks?: (UserBookmarkModel | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyStoryModel = {
  readonly [__modelMeta__]: {
    identifier: OptionallyManagedIdentifier<Story, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly type?: string | null;
  readonly title: string;
  readonly audioUri?: string | null;
  readonly summary?: string | null;
  readonly description?: string | null;
  readonly credit?: string | null;
  readonly imageUri?: string | null;
  readonly duration?: number | null;
  readonly numListens?: number | null;
  readonly nsfw?: string | null;
  readonly live?: string | null;
  readonly isErotic?: string | null;
  readonly transcript?: string | null;
  readonly publishedAt?: string | null;
  readonly publishedYear?: number | null;
  readonly avgRating?: number | null;
  readonly numRatings?: number | null;
  readonly numComments?: number | null;
  readonly authorId?: string | null;
  readonly publisherId?: string | null;
  readonly primaryTagId?: string | null;
  readonly secondaryTagId?: string | null;
  readonly author: AsyncItem<AuthorModel | undefined>;
  readonly publisher: AsyncItem<PublisherModel | undefined>;
  readonly tags: AsyncCollection<StoryTagModel>;
  readonly pinnedBy: AsyncCollection<UserPinnedStoryModel>;
  readonly finishedBy: AsyncCollection<UserFinishedStoryModel>;
  readonly inProgressBy: AsyncCollection<UserInProgressStoryModel>;
  readonly ratings: AsyncCollection<UserRatingModel>;
  readonly reactions: AsyncCollection<UserReactionModel>;
  readonly comments: AsyncCollection<CommentModel>;
  readonly favoritedBy: AsyncCollection<UserFavoritedStoryModel>;
  readonly bookmarks: AsyncCollection<UserBookmarkModel>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type StoryModel = LazyLoading extends LazyLoadingDisabled ? EagerStoryModel : LazyStoryModel

export declare const StoryModel: (new (init: ModelInit<StoryModel>) => StoryModel) & {
  copyOf(source: StoryModel, mutator: (draft: MutableModel<StoryModel>) => MutableModel<StoryModel> | void): StoryModel;
}

type EagerTagModel = {
  readonly [__modelMeta__]: {
    identifier: OptionallyManagedIdentifier<Tag, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name: string;
  readonly isPrimary?: boolean | null;
  readonly color?: string | null;
  readonly icon?: string | null;
  readonly imageUri?: string | null;
  readonly tileImageUri?: string | null;
  readonly isErotic?: boolean | null;
  readonly stories?: (StoryTagModel | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyTagModel = {
  readonly [__modelMeta__]: {
    identifier: OptionallyManagedIdentifier<Tag, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name: string;
  readonly isPrimary?: boolean | null;
  readonly color?: string | null;
  readonly icon?: string | null;
  readonly imageUri?: string | null;
  readonly tileImageUri?: string | null;
  readonly isErotic?: boolean | null;
  readonly stories: AsyncCollection<StoryTagModel>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type TagModel = LazyLoading extends LazyLoadingDisabled ? EagerTagModel : LazyTagModel

export declare const TagModel: (new (init: ModelInit<TagModel>) => TagModel) & {
  copyOf(source: TagModel, mutator: (draft: MutableModel<TagModel>) => MutableModel<TagModel> | void): TagModel;
}

type EagerUserBookmarkModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserBookmark, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly positionSeconds: number;
  readonly name?: string | null;
  readonly createdAt?: string | null;
  readonly story?: StoryModel | null;
  readonly user?: UserModel | null;
  readonly updatedAt?: string | null;
}

type LazyUserBookmarkModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserBookmark, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly storyId: string;
  readonly positionSeconds: number;
  readonly name?: string | null;
  readonly createdAt?: string | null;
  readonly story: AsyncItem<StoryModel | undefined>;
  readonly user: AsyncItem<UserModel | undefined>;
  readonly updatedAt?: string | null;
}

export declare type UserBookmarkModel = LazyLoading extends LazyLoadingDisabled ? EagerUserBookmarkModel : LazyUserBookmarkModel

export declare const UserBookmarkModel: (new (init: ModelInit<UserBookmarkModel>) => UserBookmarkModel) & {
  copyOf(source: UserBookmarkModel, mutator: (draft: MutableModel<UserBookmarkModel>) => MutableModel<UserBookmarkModel> | void): UserBookmarkModel;
}

type EagerStoryTagModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<StoryTag, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly storyId: string;
  readonly tagId: string;
  readonly story?: StoryModel | null;
  readonly tag?: TagModel | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyStoryTagModel = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<StoryTag, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly storyId: string;
  readonly tagId: string;
  readonly story: AsyncItem<StoryModel | undefined>;
  readonly tag: AsyncItem<TagModel | undefined>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type StoryTagModel = LazyLoading extends LazyLoadingDisabled ? EagerStoryTagModel : LazyStoryTagModel

export declare const StoryTagModel: (new (init: ModelInit<StoryTagModel>) => StoryTagModel) & {
  copyOf(source: StoryTagModel, mutator: (draft: MutableModel<StoryTagModel>) => MutableModel<StoryTagModel> | void): StoryTagModel;
}



const { User, UserPinnedStory, UserFinishedStory, UserInProgressStory, UserRating, UserReaction, Comment, UserFavoritedStory, UserFollowedAuthor, StoryReactionCount, Publisher, Author, Story, Tag, UserBookmark, StoryTag } = initSchema(schema) as {
  User: PersistentModelConstructor<UserModel>;
  UserPinnedStory: PersistentModelConstructor<UserPinnedStoryModel>;
  UserFinishedStory: PersistentModelConstructor<UserFinishedStoryModel>;
  UserInProgressStory: PersistentModelConstructor<UserInProgressStoryModel>;
  UserRating: PersistentModelConstructor<UserRatingModel>;
  UserReaction: PersistentModelConstructor<UserReactionModel>;
  Comment: PersistentModelConstructor<CommentModel>;
  UserFavoritedStory: PersistentModelConstructor<UserFavoritedStoryModel>;
  UserFollowedAuthor: PersistentModelConstructor<UserFollowedAuthorModel>;
  StoryReactionCount: PersistentModelConstructor<StoryReactionCountModel>;
  Publisher: PersistentModelConstructor<PublisherModel>;
  Author: PersistentModelConstructor<AuthorModel>;
  Story: PersistentModelConstructor<StoryModel>;
  Tag: PersistentModelConstructor<TagModel>;
  UserBookmark: PersistentModelConstructor<UserBookmarkModel>;
  StoryTag: PersistentModelConstructor<StoryTagModel>;
};

export {
  User,
  UserPinnedStory,
  UserFinishedStory,
  UserInProgressStory,
  UserRating,
  UserReaction,
  Comment,
  UserFavoritedStory,
  UserFollowedAuthor,
  StoryReactionCount,
  Publisher,
  Author,
  Story,
  Tag,
  UserBookmark,
  StoryTag
};