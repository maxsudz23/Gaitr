// Data access for the social graph: user profiles, follows, review likes,
// review comments, and saved shoes. Review lists (including the feed) live in
// reviews.ts so every list shares one Review shape.
import type { QueryData } from '@supabase/supabase-js';

import { embeddedCount } from './reviews';
import { supabase } from './supabase';

// Postgres foreign-key violation. For likes/comments it means the review was
// deleted (e.g. by its author) after this screen loaded it.
const FOREIGN_KEY_VIOLATION = '23503';

export function isMissingReviewError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === FOREIGN_KEY_VIOLATION;
}

// --- Profiles + follows ---

// follows has two FKs to profiles, so each count embed names the FK it uses:
// followers are rows where this profile is `following_id`, and vice versa.
function profileQuery() {
  return supabase
    .from('profiles')
    .select(
      'id, username, display_name, bio, followers:follows!follows_following_id_fkey(count), following:follows!follows_follower_id_fkey(count)',
    );
}

type ProfileRow = QueryData<ReturnType<typeof profileQuery>>[number];

export type PublicProfile = Omit<ProfileRow, 'followers' | 'following'> & {
  followerCount: number;
  followingCount: number;
};

export async function fetchProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await profileQuery().eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { followers, following, ...rest } = data;
  return {
    ...rest,
    followerCount: embeddedCount(followers),
    followingCount: embeddedCount(following),
  };
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function setFollowing(
  followerId: string,
  followingId: string,
  follow: boolean,
): Promise<void> {
  const { error } = follow
    ? await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
    : await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
  if (error) throw error;
}

// --- Review likes ---

export async function setReviewLiked(
  userId: string,
  reviewId: string,
  liked: boolean,
): Promise<void> {
  const { error } = liked
    ? await supabase.from('review_likes').insert({ user_id: userId, review_id: reviewId })
    : await supabase.from('review_likes').delete().eq('user_id', userId).eq('review_id', reviewId);
  if (error) throw error;
}

// --- Review comments ---

const COMMENT_SELECT =
  'id, user_id, parent_id, body, created_at, author:profiles(id, username, display_name)';

function commentQuery() {
  return supabase.from('review_comments').select(COMMENT_SELECT);
}

export type ReviewComment = QueryData<ReturnType<typeof commentQuery>>[number];

export const MAX_COMMENT_LENGTH = 1000;

// Every comment on a review, oldest first, replies included. Replies carry
// `parent_id` (always a top-level comment); see groupReplies.
export async function fetchComments(reviewId: string): Promise<ReviewComment[]> {
  const { data, error } = await commentQuery()
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/** Posts a comment, or a reply when `parentId` (a top-level comment) is given. */
export async function addComment(
  userId: string,
  reviewId: string,
  body: string,
  parentId: string | null = null,
): Promise<ReviewComment> {
  const { data, error } = await supabase
    .from('review_comments')
    .insert({ user_id: userId, review_id: reviewId, body: body.trim(), parent_id: parentId })
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

/** Splits a flat comment list into top-level comments and replies by parent. */
export function groupReplies(comments: ReviewComment[]) {
  const topLevel: ReviewComment[] = [];
  const replies = new Map<string, ReviewComment[]>();
  for (const comment of comments) {
    if (comment.parent_id) {
      replies.set(comment.parent_id, [...(replies.get(comment.parent_id) ?? []), comment]);
    } else {
      topLevel.push(comment);
    }
  }
  return { topLevel, replies };
}

// Deleting a top-level comment also deletes its replies (FK cascade).
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('review_comments').delete().eq('id', commentId);
  if (error) throw error;
}

// --- Saved shoes (private to each user) ---

export async function isShoeSaved(userId: string, shoeId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('saved_shoes')
    .select('shoe_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('shoe_id', shoeId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function setShoeSaved(userId: string, shoeId: string, saved: boolean): Promise<void> {
  const { error } = saved
    ? await supabase.from('saved_shoes').insert({ user_id: userId, shoe_id: shoeId })
    : await supabase.from('saved_shoes').delete().eq('user_id', userId).eq('shoe_id', shoeId);
  if (error) throw error;
}

function savedShoesQuery() {
  return supabase
    .from('saved_shoes')
    .select('created_at, shoe:shoes(id, name, brand:brands(name))');
}

export type SavedShoe = NonNullable<QueryData<ReturnType<typeof savedShoesQuery>>[number]['shoe']>;

export async function fetchSavedShoes(userId: string): Promise<SavedShoe[]> {
  const { data, error } = await savedShoesQuery()
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.flatMap((row) => (row.shoe ? [row.shoe] : []));
}
