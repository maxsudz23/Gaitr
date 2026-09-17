import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GatorLogo } from '@/components/gator-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';

type Mode = 'signIn' | 'signUp';

export default function SignInScreen() {
  const theme = useTheme();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === 'signUp';

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    // On success the auth listener updates the session and the root guard
    // redirects into the app — no manual navigation here.
    const { error } = isSignUp
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);
    if (error) {
      setError(error);
    }
    setSubmitting(false);
  }

  function toggleMode() {
    setMode(isSignUp ? 'signIn' : 'signUp');
    setError(null);
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          <ThemedView style={styles.header}>
            <GatorLogo size={72} />
            <ThemedText type="title">Gaitr</ThemedText>
            <ThemedText themeColor="textSecondary">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.fields}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
              onSubmitEditing={() => canSubmit && handleSubmit()}
            />

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accent, opacity: canSubmit ? (pressed ? 0.85 : 1) : 0.4 },
              ]}>
              {submitting ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText style={{ color: theme.onAccent }} type="smallBold">
                  {isSignUp ? 'Sign up' : 'Sign in'}
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>

          <Pressable onPress={toggleMode} disabled={submitting} style={styles.toggle}>
            <ThemedText type="small" themeColor="textSecondary">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <ThemedText type="smallBold">{isSignUp ? 'Sign in' : 'Sign up'}</ThemedText>
            </ThemedText>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    gap: Spacing.five,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  fields: {
    gap: Spacing.three,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
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
  toggle: {
    alignItems: 'center',
  },
});
