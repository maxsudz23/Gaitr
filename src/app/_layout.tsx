import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync();

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

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}
