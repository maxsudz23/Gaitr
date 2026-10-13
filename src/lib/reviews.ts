// Data access for reviews, aspect ratings, and review photos. Same approach as
// shoes.ts: queries live here, row types are derived from them via QueryData.
import type { QueryData } from '@supabase/supabase-js';
import type { ImagePickerAsset } from 'expo-image-picker';

import type { Database } from './database.types';
import { supabase } from './supabase';

export type RatingAspect = Database['public']['Enums']['rating_aspect'];
export type AspectScores = Partial<Record<RatingAspect, number>>;

// Display order for the per-aspect ratings (enum order isn't guaranteed to be
// the order we want to show them in).
export const RATING_ASPECTS: RatingAspect[] = [
  'comfort',
  'cushioning',
  'fit',
  'durability',
  'traction',
  'breathability',
  'style',
  'value',
];

export const MAX_REVIEW_PHOTOS = 4;
const MEDIA_BUCKET = 'review-media';

// --- Reading reviews ---

// One select shared by every review list (shoe page, user profile, feed), so
// they all return the same Review shape. A `const` keeps the literal type that
// QueryData needs to infer the row type.
//
// - `author` needs the explicit FK hint: review_likes also links reviews to
//   profiles, so a bare `profiles(...)` embed is ambiguous to PostgREST.
// - `my_like` is the viewer's own like (0 or 1 rows); every query below must
//   filter it with `.eq('my_like.user_id', viewerId)`.
const REVIEW_SELECT =
  'id, user_id, shoe_id, overall_rating, title, body, created_at, updated_at, author:profiles!reviews_user_id_fkey(id, username, display_name), shoe:shoes(id, name, brand:brands(name)), ratings(aspect, score), media(id, storage_path, width, height, position), like_count:review_likes(count), comment_count:review_comments(count), my_like:review_likes(user_id)';

function reviewQuery() {
  return supabase.from('reviews').select(REVIEW_SELECT);
}

export type Review = QueryData<ReturnType<typeof reviewQuery>>[number];
export type ReviewMedia = Review['media'][number];

export async function fetchShoeReviews(shoeId: string, viewerId: string): Promise<Review[]> {
  const { data, error } = await reviewQuery()
    .eq('shoe_id', shoeId)
    .eq('my_like.user_id', viewerId)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'media' });
  if (error) throw error;
  return data;
}

export async function fetchUserReviews(userId: string, viewerId: string): Promise<Review[]> {
  const { data, error } = await reviewQuery()
    .eq('user_id', userId)
    .eq('my_like.user_id', viewerId)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'media' });
  if (error) throw error;
  return data;
}

const FEED_PAGE_SIZE = 50;

/** Reviews by people the viewer follows, newest first. */
export async function fetchFeed(viewerId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .rpc('feed_reviews')
    .select(REVIEW_SELECT)
    .eq('my_like.user_id', viewerId)
    .order('position', { referencedTable: 'media' })
    .limit(FEED_PAGE_SIZE);
  if (error) throw error;
  return data;
}

export async function fetchMyReview(shoeId: string, userId: string): Promise<Review | null> {
  const { data, error } = await reviewQuery()
    .eq('shoe_id', shoeId)
    .eq('user_id', userId)
    .eq('my_like.user_id', userId)
    .order('position', { referencedTable: 'media' })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchReview(reviewId: string, viewerId: string): Promise<Review | null> {
  const { data, error } = await reviewQuery()
    .eq('id', reviewId)
    .eq('my_like.user_id', viewerId)
    .order('position', { referencedTable: 'media' })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type RatingStats = { reviewCount: number; averageRating: number | null };

export async function fetchRatingStats(shoeId: string): Promise<RatingStats> {
  const { data, error } = await supabase
    .from('shoe_rating_stats')
    .select('review_count, average_rating')
    .eq('shoe_id', shoeId)
    .maybeSingle();
  if (error) throw error;
  // No row means no reviews yet (the view only has shoes that were reviewed).
  return {
    reviewCount: data?.review_count ?? 0,
    averageRating: data?.average_rating ?? null,
  };
}

// --- Writing reviews ---

export type ReviewDraft = {
  shoeId: string;
  overallRating: number;
  title: string;
  body: string;
  aspects: AspectScores;
};

/** Creates or updates the signed-in user's review; returns the review id. */
export async function saveReview(draft: ReviewDraft): Promise<string> {
  const { data, error } = await supabase.rpc('save_review', {
    target_shoe_id: draft.shoeId,
    overall: draft.overallRating,
    review_title: draft.title,
    review_body: draft.body,
    aspect_ratings: draft.aspects,
  });
  if (error) throw error;
  return data;
}

/** Deletes a review. Photos are removed from Storage first; their media rows
 *  are then removed by the review's ON DELETE CASCADE. */
export async function deleteReview(review: Review): Promise<void> {
  await removeStorageObjects(review.media.map((m) => m.storage_path));
  const { error } = await supabase.from('reviews').delete().eq('id', review.id);
  if (error) throw error;
}

// --- Photos ---

export function reviewMediaUrl(storagePath: string): string {
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

/**
 * Uploads one picked image for a review and records it in the media table.
 * Files go to `<user_id>/<review_id>/<random>.<ext>`; the storage policies only
 * allow writes under the caller's own user id.
 */
export async function uploadReviewPhoto(params: {
  userId: string;
  reviewId: string;
  shoeId: string;
  asset: ImagePickerAsset;
  position: number;
}): Promise<void> {
  const { userId, reviewId, shoeId, asset, position } = params;
  const contentType = asset.mimeType ?? 'image/jpeg';
  const extension = contentType.split('/')[1] ?? 'jpg';
  const path = `${userId}/${reviewId}/${Date.now()}-${position}.${extension}`;

  // React Native's fetch can read local file:// URIs into an ArrayBuffer,
  // which is the body format supabase-js expects on native.
  const fileBody = await fetch(asset.uri).then((res) => res.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, fileBody, { contentType });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from('media').insert({
    user_id: userId,
    review_id: reviewId,
    shoe_id: shoeId,
    type: 'image',
    storage_path: path,
    width: asset.width,
    height: asset.height,
    position,
  });
  if (insertError) {
    // Don't leave an orphaned file behind if the row couldn't be written.
    await removeStorageObjects([path]);
    throw insertError;
  }
}

export async function deleteReviewPhotos(media: ReviewMedia[]): Promise<void> {
  if (media.length === 0) return;
  await removeStorageObjects(media.map((m) => m.storage_path));
  const { error } = await supabase
    .from('media')
    .delete()
    .in(
      'id',
      media.map((m) => m.id),
    );
  if (error) throw error;
}

async function removeStorageObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  if (error) throw error;
}

// --- Presentation helpers ---

export function formatRating(value: number): string {
  return value.toFixed(1);
}

export function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Count from an embedded `table(count)` aggregate, which arrives as [{ count }]. */
export function embeddedCount(rows: { count: number }[]): number {
  return rows[0]?.count ?? 0;
}

export function authorName(author: Review['author']): string {
  return author?.display_name || author?.username || 'Unknown';
}

export function aspectScores(review: Pick<Review, 'ratings'>): AspectScores {
  return Object.fromEntries(review.ratings.map((r) => [r.aspect, r.score]));
}
