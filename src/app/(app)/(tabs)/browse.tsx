import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShoeCard } from '@/components/shoe-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchShoes, type ShoeListItem } from '@/lib/shoes';

export default function BrowseScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [shoes, setShoes] = useState<ShoeListItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchShoes();
      setShoes(data);
      setStatus('ready');
    } catch (error) {
      console.error('Failed to load shoes', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (status === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (status === 'error') {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">Couldn&apos;t load shoes</ThemedText>
        <ThemedText themeColor="textSecondary">Pull down to try again.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={shoes}
        keyExtractor={(shoe) => shoe.id}
        renderItem={({ item }) => <ShoeCard shoe={item} />}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
        ]}
        ListHeaderComponent={
          <ThemedText type="subtitle" style={styles.heading}>
            Browse
          </ThemedText>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary">No shoes yet.</ThemedText>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
        }
      />
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
    gap: Spacing.two,
    padding: Spacing.four,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  column: {
    gap: Spacing.three,
  },
  heading: {
    marginBottom: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
});
