import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SuggestedReviewer } from '@/lib/discovery';
import { authorName } from '@/lib/reviews';
import { setFollowing } from '@/lib/social';

type SuggestedReviewersProps = {
  viewerId: string;
  reviewers: SuggestedReviewer[];
  /** Called after a follow or unfollow is saved, so the feed can reload. */
  onFollowChange?: () => void;
};

// "People to follow" on the Feed: a horizontal row of reviewer cards, each
// with a Follow button. Following keeps the card in place (now showing
// "Following") until the list next reloads, so a mis-tap is easy to undo.
export function SuggestedReviewers({ viewerId, reviewers, onFollowChange }: SuggestedReviewersProps) {
  const theme = useTheme();
  const router = useRouter();
  const [followed, setFollowed] = useState<Set<string>>(() => new Set());

  if (reviewers.length === 0) return null;

  async function toggleFollow(id: string) {
    const follow = !followed.has(id);
    const update = (add: boolean) =>
      setFollowed((current) => {
        const next = new Set(current);
        if (add) next.add(id);
        else next.delete(id);
        return next;
      });
    update(follow);
    try {
      await setFollowing(viewerId, id, follow);
      onFollowChange?.();
    } catch (error) {
      console.error('Failed to update follow', error);
      update(!follow);
    }
  }

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.title}>
        People to follow
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.row}>
        {reviewers.map((reviewer) => {
          const isFollowing = followed.has(reviewer.id);
          return (
            <Pressable
              key={reviewer.id}
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: reviewer.id } })}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    {authorName(reviewer).charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {authorName(reviewer)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.reason}>
                  {reviewer.reason}
                </ThemedText>
                <Pressable
                  onPress={() => toggleFollow(reviewer.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFollowing }}
                  style={({ pressed }) => [
                    styles.followButton,
                    isFollowing
                      ? { borderColor: theme.backgroundSelected, borderWidth: 1 }
                      : { backgroundColor: theme.accent },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: isFollowing ? theme.text : theme.onAccent }}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </ThemedText>
                </Pressable>
              </ThemedView>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  // Bleeds to the screen edges; the feed list pads by Spacing.three.
  scroller: {
    marginHorizontal: -Spacing.three,
  },
  row: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    width: 156,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  reason: {
    textAlign: 'center',
    minHeight: 40,
  },
  followButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.one,
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
