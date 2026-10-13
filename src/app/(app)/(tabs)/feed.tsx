import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReviewCard } from '@/components/review-card';
import { StatusBarBackdrop } from '@/components/status-bar-backdrop';
import { SuggestedReviewers } from '@/components/suggested-reviewers';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { fetchSuggestedReviewers, type SuggestedReviewer } from '@/lib/discovery';
import { fetchFeed, type Review } from '@/lib/reviews';

// The following feed: newest reviews from people you follow, under a "People
// to follow" row. Reloads whenever the tab gains focus (e.g. after following
// someone) and on pull-to-refresh.
export default function FeedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const viewerId = session!.user.id;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedReviewer[]>([]);

  // Suggestions are a nice-to-have: if they fail, the row just stays hidden.
  const loadSuggestions = useCallback(async () => {
    try {
      setSuggestions(await fetchSuggestedReviewers());
    } catch (error) {
      console.error('Failed to load suggested reviewers', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadSuggestions();
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
    }, [viewerId, loadSuggestions]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [nextReviews] = await Promise.all([fetchFeed(viewerId), loadSuggestions()]);
      setReviews(nextReviews);
      setStatus('ready');
    } catch (error) {
      console.error('Failed to refresh feed', error);
      setStatus('error');
    }
    setRefreshing(false);
  }, [viewerId, loadSuggestions]);

  // After a follow from the suggestions row, quietly pull in their reviews.
  // The suggestions themselves stay put until the next focus or refresh.
  const reloadFeed = useCallback(() => {
    fetchFeed(viewerId)
      .then(setReviews)
      .catch((error) => console.error('Failed to reload feed', error));
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
            <ReviewCard review={item} viewerId={viewerId} showShoe largePhotos />
          )}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + Spacing.four,
              paddingBottom: BottomTabInset + Spacing.four,
            },
          ]}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="subtitle">Feed</ThemedText>
              <SuggestedReviewers
                viewerId={viewerId}
                reviewers={suggestions}
                onFollowChange={reloadFeed}
              />
            </View>
          }
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
                    Follow people to see their reviews here. Try someone from People to follow,
                    or tap a reviewer&apos;s name on any shoe page.
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
  header: {
    gap: Spacing.three,
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
