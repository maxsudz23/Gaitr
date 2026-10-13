import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

// A solid strip behind the status bar for screens without a navigation header,
// so scrolled content doesn't run underneath the clock and battery icons.
// Render it last so it sits on top of the scroll view.
export function StatusBarBackdrop() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <View
      pointerEvents="none"
      style={[styles.backdrop, { height: insets.top, backgroundColor: theme.background }]}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
