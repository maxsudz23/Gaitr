import { ScrollView, StyleSheet, View } from 'react-native';

import { ShoeCard } from '@/components/shoe-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DiscoveryShoe } from '@/lib/discovery';

const CARD_WIDTH = 168;

// A titled, horizontally scrolling row of shoe cards (Home's discovery
// sections). Renders nothing when there are no shoes, so empty sections
// simply disappear.
export function ShoeCarousel({ title, items }: { title: string; items: DiscoveryShoe[] }) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.title}>
        {title}
      </ThemedText>
      {/* Bleeds to the screen edges; the parent list pads by Spacing.three. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.row}>
        {items.map(({ shoe, caption }) => (
          <View key={shoe.id} style={styles.card}>
            <ShoeCard shoe={shoe} caption={caption} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  scroller: {
    marginHorizontal: -Spacing.three,
  },
  row: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    width: CARD_WIDTH,
  },
});
