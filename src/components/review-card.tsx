import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

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
  /**
   * Show photos full width (swipeable when there are several) instead of
   * thumbnails. Used by the feed.
   */
  largePhotos?: boolean;
};

// A review in a list (compact; tapping it opens the review page) or on the
// review page itself (`expanded`). Taps on the author, shoe, and like button
// are handled by those buttons and don't open the review.
export function ReviewCard({
  review,
  viewerId,
  showShoe = false,
  expanded = false,
  largePhotos = false,
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

  // The card isn't one big Pressable: the photos sit between two tappable
  // sections and handle their own taps (and, in the feed, swipes). Every tap
  // target shares `pressed`, so the whole card dims either way.
  const [pressed, setPressed] = useState(false);
  const tapToOpen = expanded
    ? { disabled: true }
    : {
        onPress: openReview,
        onPressIn: () => setPressed(true),
        onPressOut: () => setPressed(false),
      };
  const sectionStyle = [styles.section, expanded && styles.sectionExpanded];

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, expanded && styles.cardExpanded, pressed && styles.pressed]}>
      <Pressable
        {...tapToOpen}
        style={sectionStyle}
        accessibilityRole={expanded ? undefined : 'button'}
        accessibilityHint={expanded ? undefined : 'Opens the full review'}>
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
      </Pressable>

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
      ) : review.media.length > 0 && largePhotos ? (
        <LargePhotos media={review.media} onOpen={openReview} />
      ) : review.media.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.photos}>
            {review.media.map((photo) => (
              <Pressable key={photo.id} {...tapToOpen}>
                <Image
                  source={reviewMediaUrl(photo.storage_path)}
                  style={styles.photo}
                  contentFit="cover"
                  transition={150}
                />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}

      <Pressable {...tapToOpen} style={sectionStyle}>
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
        </View>
      </Pressable>
    </ThemedView>
  );
}

// Full-width photos for the feed, swiped left and right like a slideshow
// when there are several (a counter in the corner and dots underneath show
// where you are). Every photo shares one frame, shaped like the first photo
// and clamped between 4:5 portrait and 16:9 landscape so a panorama or tall
// shot doesn't dominate the feed.
//
// Paging is a gesture-handler pan rather than a horizontal ScrollView: a
// nested ScrollView never received the swipe here (tapping-to-open won and
// the review opened instead). The pan only activates on clearly sideways
// movement, so vertical drags still scroll the feed, and a plain tap opens
// the review.
const SWIPE_DISTANCE = 0.2; // fraction of the width that flips a page
const SWIPE_VELOCITY = 500; // px/s; a quick flick flips a page too

function LargePhotos({ media, onOpen }: { media: Review['media']; onOpen: () => void }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const offset = useSharedValue(0); // the strip's translateX
  const current = useSharedValue(0); // page index, readable from worklets
  const count = media.length;
  const first = media[0];
  const ratio = first.width && first.height ? first.width / first.height : 4 / 3;

  const pan = Gesture.Pan()
    .enabled(count > 1 && width > 0)
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      const minOffset = -(count - 1) * width;
      const next = -current.get() * width + event.translationX;
      // Resist (rather than stop) dragging past the first or last photo.
      offset.set(
        next > 0 ? next / 3 : next < minOffset ? minOffset + (next - minOffset) / 3 : next,
      );
    })
    .onEnd((event) => {
      let next = current.get();
      if (event.translationX < -width * SWIPE_DISTANCE || event.velocityX < -SWIPE_VELOCITY) {
        next = Math.min(next + 1, count - 1);
      } else if (event.translationX > width * SWIPE_DISTANCE || event.velocityX > SWIPE_VELOCITY) {
        next = Math.max(next - 1, 0);
      }
      current.set(next);
      offset.set(withTiming(-next * width, { duration: 220 }));
      scheduleOnRN(setPage, next);
    });
  const tap = Gesture.Tap().onEnd((_event, success) => {
    if (success) scheduleOnRN(onOpen);
  });
  // A swipe wins over a tap; a tap only fires if the finger didn't swipe.
  const gesture = Gesture.Exclusive(pan, tap);

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));

  return (
    <View style={styles.largePhotosSection}>
      <GestureDetector gesture={gesture}>
        <View
          style={[styles.largePhotos, { aspectRatio: Math.min(Math.max(ratio, 4 / 5), 16 / 9) }]}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            setWidth(nextWidth);
            offset.set(-current.get() * nextWidth);
          }}
          accessibilityRole="button"
          accessibilityHint="Opens the full review"
          accessibilityLabel={count > 1 ? `Photo ${page + 1} of ${count}` : 'Photo'}>
          {width > 0 ? (
            <Animated.View style={[styles.strip, { width: width * count }, stripStyle]}>
              {media.map((photo) => (
                <Image
                  key={photo.id}
                  source={reviewMediaUrl(photo.storage_path)}
                  style={{ width, height: '100%' }}
                  contentFit="cover"
                  transition={150}
                />
              ))}
            </Animated.View>
          ) : null}
          {count > 1 ? (
            <View style={styles.pageBadge} pointerEvents="none">
              <ThemedText type="small" style={styles.pageBadgeText}>
                {page + 1}/{count}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </GestureDetector>
      {count > 1 ? (
        <View style={styles.dots}>
          {media.map((photo, index) => (
            <View
              key={photo.id}
              style={[
                styles.dot,
                index === page
                  ? { backgroundColor: theme.accent }
                  : { backgroundColor: theme.textSecondary, opacity: 0.4 },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
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
  section: {
    gap: Spacing.two,
  },
  sectionExpanded: {
    gap: Spacing.three,
  },
  strip: {
    flexDirection: 'row',
    height: '100%',
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
  largePhotosSection: {
    gap: Spacing.two,
  },
  largePhotos: {
    width: '100%',
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  pageBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  pageBadgeText: {
    color: '#fff',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
