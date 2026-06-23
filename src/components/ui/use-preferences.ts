"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client-side preferences: favorite team IDs + selected country.
 * Persisted to localStorage. No auth, no server round-trip.
 */

const STORAGE_KEY = "pitchscope:prefs:v1";

interface Prefs {
  favorites: number[];
  country: string | null;
}

const DEFAULT: Prefs = { favorites: [], country: null };

function read(): Prefs {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      country: typeof parsed.country === "string" ? parsed.country : null,
    };
  } catch {
    return DEFAULT;
  }
}

function write(prefs: Prefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  // Notify other components in the same tab.
  window.dispatchEvent(new CustomEvent("pitchscope:prefs-changed"));
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Intentional: localStorage can't be read during render (SSR has no
    // `window`), so we hydrate from it once on mount. This is the canonical
    // client-hydration pattern and avoids a server/client markup mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(read());
    setHydrated(true);
    const onChange = () => setPrefs(read());
    window.addEventListener("pitchscope:prefs-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("pitchscope:prefs-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const toggleFavorite = useCallback((teamId: number) => {
    const current = read();
    const next = current.favorites.includes(teamId)
      ? current.favorites.filter((id) => id !== teamId)
      : [...current.favorites, teamId];
    write({ ...current, favorites: next });
  }, []);

  return {
    favorites: prefs.favorites,
    country: prefs.country,
    hydrated,
    toggleFavorite,
    isFavorite: (teamId: number) => prefs.favorites.includes(teamId),
  };
}
