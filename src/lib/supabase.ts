// Supabase client, configured for React Native session persistence per the
// Expo v57 guide (https://docs.expo.dev/guides/using-supabase/).
//
// `expo-sqlite/localStorage/install` installs a `localStorage` global backed by
// SQLite so the auth session survives app restarts. Expo already provides a
// `URL` global, so no url-polyfill import is needed.
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session on native; there's no browser redirect to read from.
    detectSessionInUrl: false,
  },
});

// Only run the token auto-refresh loop while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
