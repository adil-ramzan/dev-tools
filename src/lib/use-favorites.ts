"use client";

import { useSyncExternalStore } from "react";
import { getFavorites, getServerFavorites, setFavorites, subscribeFavorites, toggleFavorite } from "@/lib/favorites";

/** Favorite tool slugs, shared by every component on the page and kept in sync with other tabs. */
export function useFavorites() {
  const favorites = useSyncExternalStore(subscribeFavorites, getFavorites, getServerFavorites);
  return {
    favorites,
    isFavorite: (slug: string) => favorites.includes(slug),
    /** Returns whether the tool is a favorite afterwards. */
    toggle: (slug: string) => {
      const next = toggleFavorite(getFavorites(), slug);
      setFavorites(next);
      return next.includes(slug);
    },
  };
}
