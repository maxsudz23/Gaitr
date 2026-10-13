import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReviewCard } from '@/components/review-card';
import { StatusBarBackdrop } from '@/components/status-bar-backdrop';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { fetchFeed, type Review } from '@/lib/reviews';

// The following feed: newest reviews from people you follow. Reloads whenever
// the tab gains focus (e.g. after following someone) and on pull-to-refresh.
export default function FeedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const viewerId = session!.user.id;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchFeed(viewerId)
        .then((data) => {
          if (!active) return;
          setReviews(data);
          setStatus('ready');
        })
        .catch((error) => {
          if (!active) return;
          console.error('Failed to load feed', error);
          setStatus('error');
        });
      return () => {
        active = false;
      };
    }, [viewerId]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setReviews(await fetchFeed(viewerId));
      setStatus('ready');
    } catch (error) {
      console.error('Failed to refresh feed', error);
      setStatus('error');
    }
    setRefreshing(false);
  }, [viewerId]);

  return (
    <ThemedView style={styles.container}>
      {status === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(review) => review.id}
          renderItem={({ item }) => (
            <ReviewCard review={item} viewerId={viewerId} showShoe showSeeReview />
          )}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + Spacing.four,
              paddingBottom: BottomTabInset + Spacing.four,
            },
          ]}
          ListHeaderComponent={<ThemedText type="subtitle">Feed</ThemedText>}
          ListEmptyComponent={
            <View style={styles.empty}>
              {status === 'error' ? (
                <>
                  <ThemedText type="smallBold">Couldn&apos;t load your feed</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Pull down to try again.
                  </ThemedText>
                </>
              ) : (
                <>
                  <ThemedText type="smallBold">Your feed is empty</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                    Follow people to see their reviews here. Tap a reviewer&apos;s name on any
                    shoe page to visit their profile.
                  </ThemedText>
                </>
              )}
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
          }
        />
      )}
      <StatusBarBackdrop />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  emptyText: {
    textAlign: 'center',
  },
});
