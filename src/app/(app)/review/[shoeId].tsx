import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import {
  MAX_REVIEW_PHOTOS,
  RATING_ASPECTS,
  aspectScores,
  deleteReview,
  deleteReviewPhotos,
  fetchMyReview,
  formatRating,
  reviewMediaUrl,
  saveReview,
  uploadReviewPhoto,
  type AspectScores,
  type RatingAspect,
  type Review,
  type ReviewMedia,
} from '@/lib/reviews';
import { fetchShoeById, formatCategory } from '@/lib/shoes';

// Write a new review, or edit the signed-in user's existing one. One screen
// handles both because the database allows one review per user per shoe.
export default function WriteReviewScreen() {
  const { shoeId } = useLocalSearchParams<{ shoeId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [shoeName, setShoeName] = useState('');
  const [existing, setExisting] = useState<Review | null>(null);

  const [overall, setOverall] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [aspects, setAspects] = useState<AspectScores>({});
  // Photos already saved on the review, minus any the user removed this session.
  const [keptPhotos, setKeptPhotos] = useState<ReviewMedia[]>([]);
  const [removedPhotos, setRemovedPhotos] = useState<ReviewMedia[]>([]);
  // Newly picked photos, uploaded on save.
  const [newPhotos, setNewPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchShoeById(shoeId), fetchMyReview(shoeId, userId)])
      .then(([shoe, review]) => {
        if (!active) return;
        setShoeName(shoe?.name ?? '');
        if (review) {
          setExisting(review);
          setOverall(review.overall_rating);
          setTitle(review.title ?? '');
          setBody(review.body ?? '');
          setAspects(aspectScores(review));
          setKeptPhotos(review.media);
        }
        setStatus('ready');
      })
      .catch((loadError) => {
        if (!active) return;
        console.error('Failed to load review form', loadError);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [shoeId, userId]);

  const photoCount = keptPhotos.length + newPhotos.length;
  const canSave = overall > 0 && !saving;

  function setAspect(aspect: RatingAspect, score: number) {
    setAspects((current) => {
      const next = { ...current };
      if (score === 0) delete next[aspect];
      else next[aspect] = score;
      return next;
    });
  }

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: MAX_REVIEW_PHOTOS - photoCount,
      quality: 0.8,
    });
    if (!result.canceled) {
      setNewPhotos((current) =>
        [...current, ...result.assets].slice(0, MAX_REVIEW_PHOTOS - keptPhotos.length),
      );
    }
  }

  function removeKeptPhoto(photo: ReviewMedia) {
    setKeptPhotos((current) => current.filter((p) => p.id !== photo.id));
    setRemovedPhotos((current) => [...current, photo]);
  }

  function removeNewPhoto(uri: string) {
    setNewPhotos((current) => current.filter((p) => p.uri !== uri));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const reviewId = await saveReview({ shoeId, overallRating: overall, title, body, aspects });

      if (removedPhotos.length > 0) {
        await deleteReviewPhotos(removedPhotos);
        setRemovedPhotos([]);
      }

      // Upload one at a time, dropping each from the pending list once it's
      // stored, so retrying after a failure doesn't duplicate earlier photos.
      let position = Math.max(-1, ...keptPhotos.map((p) => p.position)) + 1;
      for (const asset of newPhotos) {
        await uploadReviewPhoto({ userId, reviewId, shoeId, asset, position });
        position += 1;
        setNewPhotos((current) => current.filter((p) => p.uri !== asset.uri));
      }

      router.back();
    } catch (saveError) {
      console.error('Failed to save review', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Could not save your review.');
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete review?', 'This removes your rating, review, and photos.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await deleteReview(existing);
            router.back();
          } catch (deleteError) {
            console.error('Failed to delete review', deleteError);
            setError('Could not delete your review.');
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (status !== 'ready') {
    return (
      <ThemedView style={styles.centered}>
        {status === 'loading' ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <ThemedText type="subtitle">Couldn&apos;t load this review</ThemedText>
        )}
      </ThemedView>
    );
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: existing ? 'Edit review' : 'Write a review' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">{shoeName}</ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold">Your rating</ThemedText>
            <View style={styles.overallRow}>
              <StarRating value={overall} size={40} onChange={setOverall} />
              <ThemedText type="smallBold" themeColor="textSecondary">
                {overall > 0 ? formatRating(overall) : 'Tap to rate'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">Review (optional)</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="Title"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              editable={!saving}
            />
            <TextInput
              style={[inputStyle, styles.bodyInput]}
              placeholder="How do they fit, feel, and hold up?"
              placeholderTextColor={theme.textSecondary}
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
              editable={!saving}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">Rate specific aspects (optional)</ThemedText>
            <ThemedView type="backgroundElement" style={styles.aspectCard}>
              {RATING_ASPECTS.map((aspect) => (
                <View key={aspect} style={styles.aspectRow}>
                  <ThemedText type="small">{formatCategory(aspect)}</ThemedText>
                  <StarRating
                    value={aspects[aspect] ?? 0}
                    size={24}
                    allowHalf={false}
                    onChange={(score) => setAspect(aspect, score)}
                  />
                </View>
              ))}
            </ThemedView>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">
              Photos ({photoCount}/{MAX_REVIEW_PHOTOS})
            </ThemedText>
            <View style={styles.photoGrid}>
              {keptPhotos.map((photo) => (
                <PhotoThumb
                  key={photo.id}
                  uri={reviewMediaUrl(photo.storage_path)}
                  onRemove={() => removeKeptPhoto(photo)}
                  disabled={saving}
                />
              ))}
              {newPhotos.map((asset) => (
                <PhotoThumb
                  key={asset.uri}
                  uri={asset.uri}
                  onRemove={() => removeNewPhoto(asset.uri)}
                  disabled={saving}
                />
              ))}
              {photoCount < MAX_REVIEW_PHOTOS ? (
                <Pressable
                  onPress={pickPhotos}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.photo,
                    styles.addPhoto,
                    { borderColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <ThemedText type="subtitle" themeColor="textSecondary">
                    +
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </View>

          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.accent, opacity: canSave ? (pressed ? 0.85 : 1) : 0.4 },
            ]}>
            {saving ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                {existing ? 'Save changes' : 'Post review'}
              </ThemedText>
            )}
          </Pressable>

          {existing ? (
            <Pressable onPress={confirmDelete} disabled={saving} style={styles.deleteButton}>
              <ThemedText type="smallBold" style={styles.error}>
                Delete review
              </ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function PhotoThumb({
  uri,
  onRemove,
  disabled,
}: {
  uri: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <View>
      <Image source={uri} style={styles.photo} contentFit="cover" />
      <Pressable
        onPress={onRemove}
        disabled={disabled}
        style={styles.removePhoto}
        hitSlop={8}
        accessibilityLabel="Remove photo">
        <ThemedText type="smallBold" style={styles.removePhotoText}>
          ✕
        </ThemedText>
      </Pressable>
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
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  bodyInput: {
    minHeight: 140,
  },
  aspectCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  aspectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: Spacing.two,
  },
  addPhoto: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 14,
  },
  error: {
    color: '#e5484d',
  },
  button: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
