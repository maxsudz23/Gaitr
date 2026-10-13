import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReviewCard } from '@/components/review-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { authorName, fetchReview, formatReviewDate, type Review } from '@/lib/reviews';
import {
  MAX_COMMENT_LENGTH,
  addComment,
  deleteComment,
  fetchComments,
  groupReplies,
  isMissingReviewError,
  type ReviewComment,
} from '@/lib/social';

// The full review page: the review shown large, then its comments, with a
// composer pinned above the keyboard. Opened by tapping any review card.
//
// Comments thread one level deep: each top-level comment has a collapsible
// replies section. Replying to a reply posts into the same thread and starts
// the draft with "@username".
export default function ReviewDetailScreen() {
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { session } = useAuth();
  const viewerId = session!.user.id;

  const [review, setReview] = useState<Review | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  // The top-level comment a reply goes under, and who it's addressed to.
  const [replyingTo, setReplyingTo] = useState<{ parentId: string; name: string } | null>(null);
  // Top-level comments whose replies are showing.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const inputRef = useRef<TextInput>(null);

  const { topLevel, replies } = groupReplies(comments);

  useEffect(() => {
    let active = true;
    Promise.all([fetchReview(reviewId, viewerId), fetchComments(reviewId)])
      .then(([nextReview, nextComments]) => {
        if (!active) return;
        setReview(nextReview);
        setComments(nextComments);
        setStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        console.error('Failed to load comments', error);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [reviewId, viewerId]);

  const canPost = draft.trim().length > 0 && !posting;

  function toggleReplies(parentId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  // `comment` may be a reply; the new reply still goes under its top-level
  // parent, addressed to the reply's author.
  function startReply(comment: ReviewComment) {
    const parentId = comment.parent_id ?? comment.id;
    setReplyingTo({ parentId, name: authorName(comment.author) });
    const handle = comment.author?.username;
    if (handle && comment.user_id !== viewerId) setDraft(`@${handle} `);
    inputRef.current?.focus();
  }

  function cancelReply() {
    setReplyingTo(null);
    setDraft('');
  }

  async function postComment() {
    setPosting(true);
    const parentId = replyingTo?.parentId ?? null;
    try {
      const comment = await addComment(viewerId, reviewId, draft, parentId);
      setComments((current) => [...current, comment]);
      setDraft('');
      setReplyingTo(null);
      // Show the reply you just posted.
      if (parentId) setExpanded((current) => new Set(current).add(parentId));
    } catch (error) {
      if (isMissingReviewError(error)) {
        Alert.alert(
          parentId ? 'Comment unavailable' : 'Review unavailable',
          parentId
            ? 'The comment you were replying to has been deleted.'
            : 'This review has been deleted.',
        );
        if (parentId) setReplyingTo(null);
      } else {
        console.error('Failed to post comment', error);
        Alert.alert('Could not post comment', 'Please try again.');
      }
    }
    setPosting(false);
  }

  function confirmDelete(comment: ReviewComment) {
    const replyCount = replies.get(comment.id)?.length ?? 0;
    Alert.alert(
      comment.parent_id ? 'Delete reply?' : 'Delete comment?',
      replyCount > 0
        ? `Its ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'} will be deleted too.`
        : undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComment(comment.id);
              setComments((current) =>
                current.filter((c) => c.id !== comment.id && c.parent_id !== comment.id),
              );
              if (replyingTo?.parentId === comment.id) setReplyingTo(null);
            } catch (error) {
              console.error('Failed to delete comment', error);
              Alert.alert('Could not delete comment', 'Please try again.');
            }
          },
        },
      ],
    );
  }

  function renderComment(comment: ReviewComment) {
    return (
      <View style={styles.comment}>
        <View style={styles.commentHeader}>
          <Pressable
            style={styles.commentAuthor}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: comment.user_id } })}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {authorName(comment.author)}
            </ThemedText>
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary">
            {formatReviewDate(comment.created_at)}
          </ThemedText>
        </View>
        <ThemedText type="small">{comment.body}</ThemedText>
        <View style={styles.commentActions}>
          <Pressable onPress={() => startReply(comment)} hitSlop={8} accessibilityRole="button">
            <ThemedText type="smallBold" themeColor="textSecondary">
              Reply
            </ThemedText>
          </Pressable>
          {comment.user_id === viewerId ? (
            <Pressable onPress={() => confirmDelete(comment)} hitSlop={8} accessibilityRole="button">
              <ThemedText type="small" themeColor="textSecondary">
                Delete
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  if (status !== 'ready' || !review) {
    return (
      <ThemedView style={styles.centered}>
        {status === 'loading' ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <ThemedText type="subtitle">Review not found</ThemedText>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Review' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}>
        <FlatList
          data={topLevel}
          keyExtractor={(comment) => comment.id}
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          ListHeaderComponent={
            <View style={styles.header}>
              <ReviewCard review={review} viewerId={viewerId} showShoe expanded />
              <ThemedText type="smallBold">
                {/* Counts replies too, matching the count on review cards. */}
                {comments.length === 0
                  ? 'No comments yet'
                  : `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => {
            const thread = replies.get(item.id) ?? [];
            const open = expanded.has(item.id);
            return (
              <View style={styles.thread}>
                {renderComment(item)}
                {thread.length > 0 ? (
                  <View style={styles.replies}>
                    <Pressable
                      onPress={() => toggleReplies(item.id)}
                      hitSlop={8}
                      style={styles.repliesToggle}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}>
                      <View style={[styles.toggleRule, { backgroundColor: theme.textSecondary }]} />
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        {open
                          ? 'Hide replies'
                          : `View ${thread.length} ${thread.length === 1 ? 'reply' : 'replies'}`}
                      </ThemedText>
                    </Pressable>
                    {open
                      ? thread.map((reply) => (
                          <View
                            key={reply.id}
                            style={[styles.reply, { borderLeftColor: theme.backgroundSelected }]}>
                            {renderComment(reply)}
                          </View>
                        ))
                      : null}
                  </View>
                ) : null}
              </View>
            );
          }}
        />

        {replyingTo ? (
          <View
            style={[
              styles.replyingBar,
              { borderTopColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
            ]}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.replyingText}>
              Replying to <ThemedText type="smallBold">{replyingTo.name}</ThemedText>
            </ThemedText>
            <Pressable
              onPress={cancelReply}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cancel reply">
              <ThemedText type="smallBold" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
        <View
          style={[
            styles.composer,
            {
              borderTopColor: theme.backgroundSelected,
              paddingBottom: Math.max(insets.bottom, Spacing.two),
            },
          ]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            placeholder={replyingTo ? 'Add a reply' : 'Add a comment'}
            placeholderTextColor={theme.textSecondary}
            value={draft}
            onChangeText={setDraft}
            maxLength={MAX_COMMENT_LENGTH}
            multiline
            editable={!posting}
          />
          <Pressable
            onPress={postComment}
            disabled={!canPost}
            style={({ pressed }) => [
              styles.postButton,
              { backgroundColor: theme.accent, opacity: canPost ? (pressed ? 0.85 : 1) : 0.4 },
            ]}>
            {posting ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                Post
              </ThemedText>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    padding: Spacing.four,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
  },
  thread: {
    gap: Spacing.two,
  },
  comment: {
    gap: Spacing.half,
  },
  commentActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.half,
  },
  replies: {
    marginLeft: Spacing.three,
    gap: Spacing.two,
  },
  repliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
  },
  toggleRule: {
    width: Spacing.four,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.5,
  },
  reply: {
    borderLeftWidth: 2,
    paddingLeft: Spacing.three,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  commentAuthor: {
    flexShrink: 1,
  },
  replyingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyingText: {
    flexShrink: 1,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    fontSize: 16,
  },
  postButton: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    minHeight: 40,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
