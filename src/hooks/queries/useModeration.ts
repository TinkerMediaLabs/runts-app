import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllPages } from '../../lib/paginate';
import { unwrap } from '@/lib/amplifyResult';

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

// ── People this listener has blocked ──────────────────────────────────────
// One listener blocks a handful of people, so the whole list is read (all pages) from the
// byUserAndBlocked index. Comments from these people are hidden on the story page.
export function useBlockedUsers() {
  return useQuery({
    queryKey: ['blockedUsers'],
    queryFn: async () => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      return fetchAllPages<any>(nextToken =>
        (client.models.UserBlock as any).listUserBlockByUserIdAndBlockedUserId(
          { userId }, { limit: 200, nextToken: nextToken ?? undefined }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ blockedUserId, blockedUserName }: { blockedUserId: string; blockedUserName?: string | null }) => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      if (userId === blockedUserId) return null;
      const existing: any = await (client.models.UserBlock as any).listUserBlockByUserIdAndBlockedUserId(
        { userId, blockedUserId: { eq: blockedUserId } }, { limit: 1 });
      if (existing.data?.length) return existing.data[0];
      return unwrap(await client.models.UserBlock.create({
        userId, blockedUserId, blockedUserName: blockedUserName ?? undefined, createdAt: new Date().toISOString(),
      }), 'Block user');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blockedUsers'] }),
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blockId: string) => {
      const client = generateClient<Schema>();
      return unwrap(await client.models.UserBlock.delete({ id: blockId }), 'Unblock user');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blockedUsers'] }),
  });
}

// ── Report a comment ──────────────────────────────────────────────────────
// Keeps a snapshot of the comment so moderators still see what was reported if it is edited or deleted.
// Reporting the same comment twice is a quiet no-op.
export function useReportComment() {
  return useMutation({
    mutationFn: async ({ comment, reason }: { comment: any; reason: ReportReason }) => {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      const existing: any = await (client.models.CommentReport as any).listCommentReportByUserIdAndCommentId(
        { userId, commentId: { eq: comment.id } }, { limit: 1 });
      if (existing.data?.length) return existing.data[0];
      return unwrap(await client.models.CommentReport.create({
        userId,
        commentId: comment.id,
        storyId: comment.storyId,
        commentContent: String(comment.content ?? '').slice(0, 1000),
        commentUserId: comment.userId,
        commentUserName: comment.userName ?? undefined,
        reason,
        status: 'open',
        createdAt: new Date().toISOString(),
      }), 'Report comment');
    },
  });
}
