import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { applyStoredThemePreference } from '@/lib/theme-preference';

SplashScreen.preventAutoHideAsync();
// Apply the saved Light/Dark/System choice before anything renders, so there's
// no flash of the wrong theme on launch.
applyStoredThemePreference();

// The route guards. Stack.Protected renders a group only when its guard is true,
// and Expo Router redirects automatically when the guard flips — so signing in
// or out moves the user between the app and the sign-in screen with no manual
// navigation calls.
function RootNavigator() {
  const { session } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayoutContent() {
  const { isLoading } = useAuth();
  const colorScheme = useColorScheme();

  // While the initial session check runs, render nothing and let the native
  // splash stay up (preventAutoHideAsync above). This avoids a flash of the
  // sign-in screen before a persisted session loads.
  if (isLoading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <RootNavigator />
    </ThemeProvider>
  );
}

// GestureHandlerRootView lets react-native-gesture-handler gestures (e.g. the
// feed's photo swiping) work anywhere in the app.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
