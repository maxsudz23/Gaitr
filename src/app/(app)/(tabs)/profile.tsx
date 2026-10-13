import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBarBackdrop } from '@/components/status-bar-backdrop';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { fetchProfile, fetchSavedShoes, type PublicProfile, type SavedShoe } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { useThemePreference, type ThemePreference } from '@/lib/theme-preference';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// Mirrors the `username_format` check constraint on the profiles table.
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
// Postgres error code for a unique-constraint violation.
const UNIQUE_VIOLATION = '23505';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const [themePreference, setThemePreference] = useThemePreference();
  const router = useRouter();
  const userId = session!.user.id;

  // Follower counts and saved shoes change from other screens, so they reload
  // whenever this tab gains focus.
  const [social, setSocial] = useState<PublicProfile | null>(null);
  const [savedShoes, setSavedShoes] = useState<SavedShoe[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([fetchProfile(userId), fetchSavedShoes(userId)])
        .then(([nextSocial, nextSaved]) => {
          if (!active) return;
          setSocial(nextSocial);
          setSavedShoes(nextSaved);
        })
        .catch((error) => console.error('Failed to load profile social data', error));
      return () => {
        active = false;
      };
    }, [userId]),
  );

  const [profile, setProfile] = useState<{ username: string; is_admin: boolean } | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    supabase
      .from('profiles')
      .select('username, is_admin')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setProfile(data);
        setUsernameDraft(data?.username ?? '');
      });
    return () => {
      active = false;
    };
  }, [session]);

  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  const usernameChanged = !!profile && usernameDraft !== profile.username;
  const canSaveUsername = usernameChanged && !savingUsername;

  function onChangeUsername(value: string) {
    // Usernames are lowercase-only, so normalize as the user types.
    setUsernameDraft(value.toLowerCase());
    setUsernameError(null);
    setUsernameSaved(false);
  }

  async function saveUsername() {
    if (!session || !profile) return;
    if (!USERNAME_PATTERN.test(usernameDraft)) {
      setUsernameError('Use 3–30 lowercase letters, numbers, or underscores.');
      return;
    }
    setSavingUsername(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: usernameDraft })
      .eq('id', session.user.id);
    setSavingUsername(false);
    if (error) {
      setUsernameError(
        error.code === UNIQUE_VIOLATION ? 'That username is taken.' : 'Could not save username.',
      );
      return;
    }
    setProfile({ ...profile, username: usernameDraft });
    setUsernameSaved(true);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.four, paddingBottom: BottomTabInset + Spacing.four },
        ]}
        keyboardShouldPersistTaps="handled">
        <ThemedText type="subtitle">Profile</ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <Field label="Signed in as" value={session?.user.email ?? '—'} />
          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Username
            </ThemedText>
            <View style={styles.usernameRow}>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.background },
                ]}
                value={usernameDraft}
                onChangeText={onChangeUsername}
                onSubmitEditing={() => canSaveUsername && saveUsername()}
                placeholder="your_username"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                editable={!!profile && !savingUsername}
                returnKeyType="done"
              />
              <Pressable
                onPress={saveUsername}
                disabled={!canSaveUsername}
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: theme.accent,
                    opacity: canSaveUsername ? (pressed ? 0.85 : 1) : 0.4,
                  },
                ]}>
                {savingUsername ? (
                  <ActivityIndicator color={theme.onAccent} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                    Save
                  </ThemedText>
                )}
              </Pressable>
            </View>
            {usernameError ? (
              <ThemedText type="small" style={styles.error}>
                {usernameError}
              </ThemedText>
            ) : usernameSaved ? (
              <ThemedText type="small" style={{ color: theme.accent }}>
                Username updated.
              </ThemedText>
            ) : null}
          </View>
          {profile?.is_admin ? (
            <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                Admin
              </ThemedText>
            </View>
          ) : null}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.statsRow}>
            <Field label="Followers" value={String(social?.followerCount ?? '—')} />
            <Field label="Following" value={String(social?.followingCount ?? '—')} />
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: userId } })}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              View your public profile
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            Saved shoes
          </ThemedText>
          {savedShoes.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Tap the bookmark on any shoe to save it here.
            </ThemedText>
          ) : (
            savedShoes.map((shoe) => (
              <Pressable
                key={shoe.id}
                onPress={() => router.push({ pathname: '/shoe/[id]', params: { id: shoe.id } })}
                style={({ pressed }) => [styles.savedRow, pressed && { opacity: 0.6 }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {shoe.brand?.name}
                </ThemedText>
                <ThemedText type="smallBold" numberOfLines={1} style={styles.savedName}>
                  {shoe.name}
                </ThemedText>
              </Pressable>
            ))
          )}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            Appearance
          </ThemedText>
          <View
            style={[styles.segmented, { backgroundColor: theme.background }]}
            accessibilityRole="radiogroup">
            {THEME_OPTIONS.map((option) => {
              const selected = option.value === themePreference;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setThemePreference(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.segment, selected && { backgroundColor: theme.accent }]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: selected ? theme.onAccent : theme.textSecondary }}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [
            styles.signOut,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            Sign out
          </ThemedText>
        </Pressable>
      </ScrollView>
      <StatusBarBackdrop />
    </ThemedView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.five,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  savedName: {
    flexShrink: 1,
  },
  field: {
    gap: Spacing.half,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  saveButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#e5484d',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  signOut: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: Spacing.half,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two - Spacing.half,
  },
});
