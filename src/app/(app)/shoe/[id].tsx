import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchShoeById, formatCategory, formatPrice, type ShoeDetail } from '@/lib/shoes';

export default function ShoeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const [shoe, setShoe] = useState<ShoeDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    fetchShoeById(id)
      .then((data) => {
        if (!active) return;
        setShoe(data);
        setStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        console.error('Failed to load shoe', error);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (status === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (status === 'error' || !shoe) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">Shoe not found</ThemedText>
      </ThemedView>
    );
  }

  const price = formatPrice(shoe.msrp_cents);
  const specs: { label: string; value: string }[] = [
    price ? { label: 'MSRP', value: price } : null,
    shoe.weight_grams ? { label: 'Weight', value: `${shoe.weight_grams} g` } : null,
    shoe.drop_mm != null ? { label: 'Drop', value: `${shoe.drop_mm} mm` } : null,
    shoe.heel_stack_mm != null ? { label: 'Heel stack', value: `${shoe.heel_stack_mm} mm` } : null,
    shoe.forefoot_stack_mm != null
      ? { label: 'Forefoot stack', value: `${shoe.forefoot_stack_mm} mm` }
      : null,
    shoe.release_year ? { label: 'Released', value: String(shoe.release_year) } : null,
  ].filter((spec): spec is { label: string; value: string } => spec !== null);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: shoe.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        {shoe.image_url ? (
          <Image source={shoe.image_url} style={styles.image} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.image, { backgroundColor: theme.backgroundSelected }]} />
        )}

        <View style={styles.header}>
          <ThemedText type="small" themeColor="textSecondary">
            {shoe.brand?.name ?? 'Unknown brand'}
          </ThemedText>
          <ThemedText type="subtitle">{shoe.name}</ThemedText>
          <ThemedText themeColor="textSecondary">{formatCategory(shoe.category)}</ThemedText>
        </View>

        {shoe.description ? <ThemedText>{shoe.description}</ThemedText> : null}

        {specs.length > 0 ? (
          <View style={styles.specGrid}>
            {specs.map((spec) => (
              <ThemedView key={spec.label} type="backgroundElement" style={styles.specCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  {spec.label}
                </ThemedText>
                <ThemedText type="smallBold">{spec.value}</ThemedText>
              </ThemedView>
            ))}
          </View>
        ) : null}

        {shoe.components.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="smallBold">Components</ThemedText>
            {shoe.components.map((component) => (
              <ThemedView key={component.id} type="backgroundElement" style={styles.componentRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatCategory(component.component_type)}
                </ThemedText>
                <ThemedText type="small">
                  {[component.name, component.material].filter(Boolean).join(' · ') || '—'}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
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
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: Spacing.four,
  },
  header: {
    gap: Spacing.half,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  specCard: {
    flexGrow: 1,
    minWidth: 100,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  section: {
    gap: Spacing.two,
  },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
});
