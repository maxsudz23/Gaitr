import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GatorLogo } from '@/components/gator-logo';
import { ShoeCard } from '@/components/shoe-card';
import { ShoeCarousel } from '@/components/shoe-carousel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchDiscovery, type Discovery } from '@/lib/discovery';
import {
  SHOE_CATEGORIES,
  fetchShoes,
  formatCategory,
  searchShoes,
  type ShoeCategory,
  type ShoeListItem,
} from '@/lib/shoes';

const SEARCH_DEBOUNCE_MS = 300;

// The home screen: discovery sections (trending, top rated, new releases),
// then the catalog grid with category filters. Searching swaps all of that
// for plain search results.
export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ShoeCategory | null>(null);
  const [shoes, setShoes] = useState<ShoeListItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const searching = query.trim().length > 0;

  // Search ignores the category filter (the chips are hidden while searching).
  const loadFor = useCallback((value: string, filter: ShoeCategory | null) => {
    const trimmed = value.trim();
    return trimmed ? searchShoes(trimmed) : fetchShoes(filter);
  }, []);

  // Discovery reflects recent activity, so refresh it whenever Home regains
  // focus (e.g. after writing a review). If it fails the sections just stay
  // hidden; the catalog below still works.
  const loadDiscovery = useCallback(async () => {
    try {
      setDiscovery(await fetchDiscovery());
    } catch (error) {
      console.error('Failed to load discovery', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDiscovery();
    }, [loadDiscovery]),
  );

  // Reload whenever the query changes. Debounced while typing so we don't fire a
  // request per keystroke; the list stays visible (status is never reset to
  // 'loading' after the first load) to avoid a flicker on every change.
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(
      () => {
        loadFor(query, category)
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
  }, [query, category, loadFor]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [nextShoes] = await Promise.all([loadFor(query, category), loadDiscovery()]);
      setShoes(nextShoes);
      setStatus('ready');
    } catch (error) {
      console.error('Failed to refresh shoes', error);
      setStatus('error');
    }
    setRefreshing(false);
  }, [query, category, loadFor, loadDiscovery]);

  const discoverHeader = searching ? null : (
    <View style={styles.discover}>
      {discovery ? (
        <>
          <ShoeCarousel title="Trending this week" items={discovery.trending} />
          <ShoeCarousel title="Top rated" items={discovery.topRated} />
          <ShoeCarousel title="New releases" items={discovery.newReleases} />
        </>
      ) : null}
      <View style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Browse
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.chips}>
          {[null, ...SHOE_CATEGORIES].map((value) => {
            const selected = value === category;
            return (
              <Pressable
                key={value ?? 'all'}
                onPress={() => setCategory(value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  { backgroundColor: selected ? theme.accent : theme.backgroundElement },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: selected ? theme.onAccent : theme.text }}>
                  {value ? formatCategory(value) : 'All'}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.brandRow}>
          <GatorLogo size={40} />
          <ThemedText type="title" style={styles.wordmark}>
            Gaitr
          </ThemedText>
        </View>
        <TextInput
          style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
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
          <ActivityIndicator color={theme.accent} />
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
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <ShoeCard shoe={item} />
            </View>
          )}
          numColumns={2}
          columnWrapperStyle={styles.column}
          ListHeaderComponent={discoverHeader}
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: BottomTabInset + Spacing.four },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText themeColor="textSecondary">
                {searching
                  ? `No shoes match “${query.trim()}”`
                  : category
                    ? `No ${formatCategory(category).toLowerCase()} shoes yet.`
                    : 'No shoes yet.'}
              </ThemedText>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.accent}
            />
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  wordmark: {
    fontSize: 34,
    lineHeight: 40,
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
  cell: {
    // Each grid cell takes an equal half of the row so both columns render.
    flex: 1,
  },
  discover: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  // Bleeds to the screen edges like the carousels.
  chipScroller: {
    marginHorizontal: -Spacing.three,
  },
  chips: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
});
