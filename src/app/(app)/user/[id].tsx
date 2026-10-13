import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ReviewCard } from '@/components/review-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { fetchUserReviews, type Review } from '@/lib/reviews';
import { fetchProfile, isFollowing, setFollowing, type PublicProfile } from '@/lib/social';

// A user's public profile: name, follower counts, a follow button, and their
// reviews. Reloads on focus so counts and likes stay fresh after navigating.
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { session } = useAuth();
  const viewerId = session!.user.id;
  const isMe = id === viewerId;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [following, setFollowingState] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [followBusy, setFollowBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        fetchProfile(id),
        fetchUserReviews(id, viewerId),
        isMe ? Promise.resolve(false) : isFollowing(viewerId, id),
      ])
        .then(([nextProfile, nextReviews, nextFollowing]) => {
          if (!active) return;
          setProfile(nextProfile);
          setReviews(nextReviews);
          setFollowingState(nextFollowing);
          setStatus('ready');
        })
        .catch((error) => {
          if (!active) return;
          console.error('Failed to load profile', error);
          setStatus('error');
        });
      return () => {
        active = false;
      };
    }, [id, viewerId, isMe]),
  );

  async function toggleFollow() {
    if (!profile) return;
    const next = !following;
    // Optimistic: flip the button and follower count, roll back on failure.
    setFollowBusy(true);
    setFollowingState(next);
    setProfile({ ...profile, followerCount: profile.followerCount + (next ? 1 : -1) });
    try {
      await setFollowing(viewerId, id, next);
    } catch (error) {
      console.error('Failed to update follow', error);
      setFollowingState(!next);
      setProfile(profile);
    }
    setFollowBusy(false);
  }

  if (status !== 'ready' || !profile) {
    return (
      <ThemedView style={styles.centered}>
        {status === 'loading' ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <ThemedText type="subtitle">User not found</ThemedText>
        )}
      </ThemedView>
    );
  }

  const name = profile.display_name || profile.username;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: name }} />
      <FlatList
        data={reviews}
        keyExtractor={(review) => review.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.nameBlock}>
              <ThemedText type="subtitle" numberOfLines={1}>
                {name}
              </ThemedText>
              {profile.display_name ? (
                <ThemedText themeColor="textSecondary">@{profile.username}</ThemedText>
              ) : null}
              {profile.bio ? <ThemedText type="small">{profile.bio}</ThemedText> : null}
            </View>

            <View style={styles.stats}>
              <Stat value={reviews.length} label={reviews.length === 1 ? 'Review' : 'Reviews'} />
              <Stat
                value={profile.followerCount}
                label={profile.followerCount === 1 ? 'Follower' : 'Followers'}
              />
              <Stat value={profile.followingCount} label="Following" />
            </View>

            {isMe ? null : (
              <Pressable
                onPress={toggleFollow}
                disabled={followBusy}
                style={({ pressed }) => [
                  styles.followButton,
                  following
                    ? { borderColor: theme.backgroundSelected, borderWidth: 1 }
                    : { backgroundColor: theme.accent },
                  { opacity: pressed ? 0.85 : 1 },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: following ? theme.text : theme.onAccent }}>
                  {following ? 'Following' : 'Follow'}
                </ThemedText>
              </Pressable>
            )}

            <ThemedText type="smallBold">Reviews</ThemedText>
          </View>
        }
        renderItem={({ item }) => <ReviewCard review={item} viewerId={viewerId} showShoe />}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary">
            No reviews yet.
          </ThemedText>
        }
      />
    </ThemedView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
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
    padding: Spacing.four,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
  },
  nameBlock: {
    gap: Spacing.half,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.five,
  },
  stat: {
    alignItems: 'flex-start',
  },
  followButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    alignItems: 'center',
  },
});
