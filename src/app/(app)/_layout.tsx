// Stack for the authenticated app. The tab bar lives in the (tabs) group; other
// screens like the shoe detail page are pushed on top of the tabs from here.
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    // Chevron-only back buttons: otherwise iOS labels the button with the
    // previous screen's title, which for the tab group is the raw "(tabs)".
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="shoe/[id]" options={{ title: '' }} />
      <Stack.Screen name="review/[shoeId]" options={{ title: '', presentation: 'modal' }} />
      <Stack.Screen name="user/[id]" options={{ title: '' }} />
      <Stack.Screen name="review-detail/[reviewId]" options={{ title: 'Review' }} />
    </Stack>
  );
}
