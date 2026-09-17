// Stack for the authenticated app. The tab bar lives in the (tabs) group; other
// screens like the shoe detail page are pushed on top of the tabs from here.
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="shoe/[id]" options={{ title: '' }} />
    </Stack>
  );
}
