// The user's Light / Dark / System appearance choice, persisted across launches.
//
// Rather than threading a theme through React context, this uses React Native's
// app-wide override: Appearance.setColorScheme() makes every useColorScheme()
// call (and native chrome like the tab bar, headers, and keyboard) report the
// chosen scheme. 'unspecified' clears the override and follows the system.
//
// Note: the override is native-only; on web the app keeps following the
// browser's setting.
import 'expo-sqlite/localStorage/install';

import { useState } from 'react';
import { Appearance } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'gaitr.themePreference';

export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function applyThemePreference(preference: ThemePreference) {
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

/** Applies the saved preference. Call once at startup, before the first render. */
export function applyStoredThemePreference() {
  applyThemePreference(getThemePreference());
}

export function useThemePreference() {
  const [preference, setPreference] = useState(getThemePreference);

  function update(next: ThemePreference) {
    localStorage.setItem(STORAGE_KEY, next);
    applyThemePreference(next);
    setPreference(next);
  }

  return [preference, update] as const;
}
