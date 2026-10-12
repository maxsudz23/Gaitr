import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  RATING_ASPECTS,
  aspectScores,
  formatReviewDate,
  reviewMediaUrl,
  type Review,
} from '@/lib/reviews';
import { formatCategory } from '@/lib/shoes';

export function ReviewCard({ review, isMine }: { review: Review; isMine: boolean }) {
  const theme = useTheme();
  const scores = aspectScores(review);
  const ratedAspects = RATING_ASPECTS.filter((aspect) => scores[aspect] != null);
  // Pair up aspects into rows so the two columns line up exactly.
  const aspectRows = Array.from({ length: Math.ceil(ratedAspects.length / 2) }, (_, i) =>
    ratedAspects.slice(i * 2, i * 2 + 2),
  );
  const author = review.author?.display_name || review.author?.username || 'Unknown';

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.authorRow}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.author}>
            {author}
          </ThemedText>
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

      <StarRating value={review.overall_rating} size={16} />

      {review.title ? <ThemedText type="smallBold">{review.title}</ThemedText> : null}
      {review.body ? <ThemedText type="small">{review.body}</ThemedText> : null}

      {review.media.length > 0 ? (
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
        <View style={styles.aspects}>
          {aspectRows.map((row) => (
            <View key={row.join()} style={styles.aspectRow}>
              {row.map((aspect) => (
                <View key={aspect} style={styles.aspectCell}>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    numberOfLines={1}
                    style={styles.aspectLabel}>
                    {formatCategory(aspect)}
                  </ThemedText>
                  <StarRating value={scores[aspect]!} size={12} />
                </View>
              ))}
              {/* Keep a lone last aspect at half width, aligned to the column. */}
              {row.length === 1 ? <View style={styles.aspectCell} /> : null}
            </View>
          ))}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
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
    gap: Spacing.one,
  },
  aspectRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  // Two equal columns, label left-aligned and stars right-aligned in each.
  aspectCell: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.one,
  },
  // On narrow screens a long label truncates rather than pushing its stars out.
  aspectLabel: {
    flexShrink: 1,
  },
});
