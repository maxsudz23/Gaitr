import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCategory, formatPrice, type ShoeListItem } from '@/lib/shoes';

export function ShoeCard({ shoe }: { shoe: ShoeListItem }) {
  const theme = useTheme();
  const price = formatPrice(shoe.msrp_cents);

  return (
    <Link href={{ pathname: '/shoe/[id]', params: { id: shoe.id } }} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.card}>
          {shoe.image_url ? (
            <Image
              source={shoe.image_url}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={[styles.image, { backgroundColor: theme.backgroundSelected }]} />
          )}

          <View style={styles.info}>
            <ThemedText type="small" themeColor="textSecondary">
              {shoe.brand?.name ?? 'Unknown brand'}
            </ThemedText>
            <ThemedText type="smallBold" numberOfLines={1}>
              {shoe.name}
            </ThemedText>
            <View style={styles.metaRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {formatCategory(shoe.category)}
              </ThemedText>
              {price ? (
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  {price}
                </ThemedText>
              ) : null}
            </View>
          </View>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  info: {
    padding: Spacing.three,
    gap: Spacing.half,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
