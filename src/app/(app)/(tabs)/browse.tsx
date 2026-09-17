import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShoeCard } from '@/components/shoe-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchShoes, searchShoes, type ShoeListItem } from '@/lib/shoes';

const SEARCH_DEBOUNCE_MS = 300;

export default function BrowseScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [shoes, setShoes] = useState<ShoeListItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const loadFor = useCallback((value: string) => {
    const trimmed = value.trim();
    return trimmed ? searchShoes(trimmed) : fetchShoes();
  }, []);

  // Reload whenever the query changes. Debounced while typing so we don't fire a
  // request per keystroke; the list stays visible (status is never reset to
  // 'loading' after the first load) to avoid a flicker on every change.
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(
      () => {
        loadFor(query)
          .then((data) => {
            if (!cancelled) {
              setShoes(data);
              setStatus('ready');
            }
          })
          .catch((error) => {
            if (!cancelled) {
              console.error('Failed to load shoes', error);
              setStatus('error');
            }
          });
      },
      query ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, loadFor]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setShoes(await loadFor(query));
      setStatus('ready');
    } catch (error) {
      console.error('Failed to refresh shoes', error);
      setStatus('error');
    }
    setRefreshing(false);
  }, [query, loadFor]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <ThemedText type="subtitle">Browse</ThemedText>
        <TextInput
          style={[
            styles.search,
            { color: theme.text, backgroundColor: theme.backgroundElement },
          ]}
          placeholder="Search shoes or brands"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {status === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.text} />
        </View>
      ) : status === 'error' ? (
        <View style={styles.centered}>
          <ThemedText type="subtitle">Couldn&apos;t load shoes</ThemedText>
          <ThemedText themeColor="textSecondary">Pull down to try again.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={shoes}
          keyExtractor={(shoe) => shoe.id}
          renderItem={({ item }) => <ShoeCard shoe={item} />}
          numColumns={2}
          columnWrapperStyle={styles.column}
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: BottomTabInset + Spacing.four },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText themeColor="textSecondary">
                {query.trim() ? `No shoes match “${query.trim()}”` : 'No shoes yet.'}
              </ThemedText>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  search: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
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
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
});
