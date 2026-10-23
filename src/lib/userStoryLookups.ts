// src/lib/userStoryLookups.ts (runts)
// Index-backed O(1) lookups for "does this user have a row for this story".
// Replaces every filter:{and:[userId,storyId]} list() call.
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

export async function findFinished(userId: string, storyId: string) {
  const { data } = await client.models.UserFinishedStory.listUserFinishedStoryByUserIdAndStoryId(
    { userId, storyId: { eq: storyId } }, { limit: 10 });
  return data ?? [];
}
export async function findRating(userId: string, storyId: string) {
  const { data } = await (client.models.UserRating as any).listUserRatingByUserIdAndStoryId(
    { userId, storyId: { eq: storyId } }, { limit: 10 });
  return (data ?? []) as any[];
}
export async function findPinned(userId: string, storyId: string) {
  const { data } = await client.models.UserPinnedStory.listUserPinnedStoryByUserIdAndStoryId(
    { userId, storyId: { eq: storyId } }, { limit: 10 });
  return data ?? [];
}
export async function findInProgress(userId: string, storyId: string) {
  const { data } = await client.models.UserInProgressStory.listUserInProgressStoryByUserIdAndStoryId(
    { userId, storyId: { eq: storyId } }, { limit: 10 });
  return data ?? [];
}
