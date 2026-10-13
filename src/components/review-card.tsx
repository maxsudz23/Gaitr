import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CommentIcon, HeartIcon } from '@/components/icons';
import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  RATING_ASPECTS,
  aspectScores,
  authorName,
  embeddedCount,
  formatReviewDate,
  reviewMediaUrl,
  type Review,
} from '@/lib/reviews';
import { formatCategory } from '@/lib/shoes';
import { isMissingReviewError, setReviewLiked } from '@/lib/social';

type ReviewCardProps = {
  review: Review;
  /** The signed-in user; used for the "You" badge and liking. */
  viewerId: string;
  /** Show which shoe the review is for (feed and profile lists). */
  showShoe?: boolean;
  /**
   * The full-size version shown on the review page: larger type and stars,
   * full-width photos, and no tap-to-open (it's already open).
   */
  expanded?: boolean;
  /** Show an explicit "See review" link (the feed), on top of tap-to-open. */
  showSeeReview?: boolean;
};

// A review in a list (compact; tapping it opens the review page) or on the
// review page itself (`expanded`). Taps on the author, shoe, and like button
// are handled by those buttons and don't open the review.
export function ReviewCard({
  review,
  viewerId,
  showShoe = false,
  expanded = false,
  showSeeReview = false,
}: ReviewCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const isMine = review.user_id === viewerId;
  const commentCount = embeddedCount(review.comment_count);

  // Likes update optimistically and roll back if the write fails. A freshly
  // loaded `review` (e.g. the list refetched on focus) replaces local state.
  const [liked, setLiked] = useState(review.my_like.length > 0);
  const [likeCount, setLikeCount] = useState(embeddedCount(review.like_count));
  const [syncedReview, setSyncedReview] = useState(review);
  if (review !== syncedReview) {
    setSyncedReview(review);
    setLiked(review.my_like.length > 0);
    setLikeCount(embeddedCount(review.like_count));
  }

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => count + (next ? 1 : -1));
    try {
      await setReviewLiked(viewerId, review.id, next);
    } catch (error) {
      if (isMissingReviewError(error)) {
        Alert.alert('Review unavailable', 'This review has been deleted.');
      } else {
        console.error('Failed to update like', error);
      }
      setLiked(!next);
      setLikeCount((count) => count + (next ? -1 : 1));
    }
  }

  const scores = aspectScores(review);
  const ratedAspects = RATING_ASPECTS.filter((aspect) => scores[aspect] != null);

  function openReview() {
    router.push({ pathname: '/review-detail/[reviewId]', params: { reviewId: review.id } });
  }

  const card = (
    <ThemedView type="backgroundElement" style={[styles.card, expanded && styles.cardExpanded]}>
      <View style={styles.headerRow}>
        <View style={styles.authorRow}>
          <Pressable
            style={styles.author}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: review.user_id } })}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {authorName(review.author)}
            </ThemedText>
          </Pressable>
          {isMine ? (
            <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="small" style={{ color: theme.accent }}>
                You
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
          {formatReviewDate(review.created_at)}
        </ThemedText>
      </View>

      {showShoe && review.shoe ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/shoe/[id]', params: { id: review.shoe_id } })
          }>
          <ThemedText type="small" style={{ color: theme.accent }} numberOfLines={1}>
            {[review.shoe.brand?.name, review.shoe.name].filter(Boolean).join(' ')}
          </ThemedText>
        </Pressable>
      ) : null}

      <StarRating value={review.overall_rating} size={expanded ? 26 : 16} />

      {review.title ? (
        <ThemedText type={expanded ? 'default' : 'smallBold'} style={expanded && styles.titleExpanded}>
          {review.title}
        </ThemedText>
      ) : null}
      {review.body ? <ThemedText type={expanded ? 'default' : 'small'}>{review.body}</ThemedText> : null}

      {review.media.length > 0 && expanded ? (
        <View style={styles.photosExpanded}>
          {review.media.map((photo) => (
            <Image
              key={photo.id}
              source={reviewMediaUrl(photo.storage_path)}
              // Keep each photo's real shape when we know it; 4:3 otherwise.
              style={[
                styles.photoExpanded,
                {
                  aspectRatio:
                    photo.width && photo.height ? photo.width / photo.height : 4 / 3,
                },
              ]}
              contentFit="cover"
              transition={150}
            />
          ))}
        </View>
      ) : review.media.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.photos}>
            {review.media.map((photo) => (
              <Image
                key={photo.id}
                source={reviewMediaUrl(photo.storage_path)}
                style={styles.photo}
                contentFit="cover"
                transition={150}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}

      {ratedAspects.length > 0 ? (
        // One aspect per row, stars right-aligned in a single column. (Two
        // columns left uneven gaps because label lengths vary so much.)
        <View style={styles.aspects}>
          {ratedAspects.map((aspect) => (
            <View key={aspect} style={styles.aspectRow}>
              <ThemedText
                type={expanded ? 'default' : 'small'}
                themeColor="textSecondary"
                numberOfLines={1}
                style={styles.aspectLabel}>
                {formatCategory(aspect)}
              </ThemedText>
              <StarRating value={scores[aspect]!} size={expanded ? 18 : 14} />
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={toggleLike}
          hitSlop={8}
          style={styles.action}
          accessibilityRole="button"
          accessibilityState={{ selected: liked }}
          accessibilityLabel={liked ? 'Unlike review' : 'Like review'}>
          <HeartIcon
            size={expanded ? 22 : 18}
            color={liked ? theme.accent : theme.textSecondary}
            filled={liked}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {likeCount}
          </ThemedText>
        </Pressable>
        {/* The review page lists comments right below, so no button there. */}
        {expanded ? null : (
          <Pressable
            onPress={openReview}
            hitSlop={8}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel="View comments">
            <CommentIcon size={18} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {commentCount}
            </ThemedText>
          </Pressable>
        )}
        {showSeeReview && !expanded ? (
          <Pressable
            onPress={openReview}
            hitSlop={8}
            style={styles.seeReview}
            accessibilityRole="link"
            accessibilityLabel="See review">
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              See review ›
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ThemedView>
  );

  if (expanded) return card;

  return (
    <Pressable
      onPress={openReview}
      style={({ pressed }) => pressed && styles.pressed}
      accessibilityRole="button"
      accessibilityHint="Opens the full review">
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  cardExpanded: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  titleExpanded: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 700,
  },
  photosExpanded: {
    gap: Spacing.two,
  },
  photoExpanded: {
    width: '100%',
    borderRadius: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  // Long names truncate instead of pushing the badge and date out of place.
  author: {
    flexShrink: 1,
  },
  date: {
    flexShrink: 0,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.one,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  // Pushed to the right end of the actions row.
  seeReview: {
    marginLeft: 'auto',
  },
  photos: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: Spacing.two,
  },
  aspects: {
    gap: Spacing.half,
  },
  aspectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  aspectLabel: {
    flexShrink: 1,
  },
});
