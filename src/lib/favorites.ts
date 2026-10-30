/**
 * Favorite tools, kept in localStorage as a JSON array of tool slugs. Nothing
 * is written until a tool is saved, and the key is removed when the last one
 * is removed. Every page shares one store: changes reach other components at
 * once, and other tabs through the `storage` event.
 */

export const FAVORITES_STORAGE_KEY = "favorites";

/** More than the registry holds, so a stored list can never grow without bound. */
export const MAX_FAVORITES = 200;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Reads a stored value. Anything malformed (bad JSON, wrong types, odd slugs) is dropped, never thrown. */
export function parseFavorites(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const slugs = value.filter((item): item is string => typeof item === "string" && item.length <= 100 && SLUG.test(item));
  return [...new Set(slugs)].slice(0, MAX_FAVORITES);
}

/** Adds the slug if it is missing, otherwise removes it. Newly saved tools go last. */
export function toggleFavorite(favorites: readonly string[], slug: string): string[] {
  return favorites.includes(slug) ? favorites.filter((s) => s !== slug) : [...favorites, slug].slice(0, MAX_FAVORITES);
}

const listeners = new Set<() => void>();
// Used instead of localStorage once it fails, so saving still works for the rest of the page's life.
let memory: string | null = null;
let storageFailed = false;
let cache: { raw: string | null; favorites: string[] } = { raw: null, favorites: [] };
const EMPTY: string[] = [];

function readRaw(): string | null {
  if (storageFailed) return memory;
  try {
    return localStorage.getItem(FAVORITES_STORAGE_KEY);
  } catch {
    storageFailed = true;
    return memory;
  }
}

/** The current favorites. The same array is returned until the stored value changes, as useSyncExternalStore requires. */
export function getFavorites(): string[] {
  const raw = readRaw();
  if (raw !== cache.raw) cache = { raw, favorites: parseFavorites(raw) };
  return cache.favorites;
}

/** Server rendering and hydration see no favorites; the client's list follows right after. */
export function getServerFavorites(): string[] {
  return EMPTY;
}

export function setFavorites(favorites: readonly string[]): void {
  const raw = favorites.length > 0 ? JSON.stringify(favorites.slice(0, MAX_FAVORITES)) : null;
  memory = raw;
  if (!storageFailed) {
    try {
      if (raw === null) localStorage.removeItem(FAVORITES_STORAGE_KEY);
      else localStorage.setItem(FAVORITES_STORAGE_KEY, raw);
    } catch {
      // Storage unavailable or full: favorites last for this page only.
      storageFailed = true;
    }
  }
  for (const listener of listeners) listener();
}

export function subscribeFavorites(listener: () => void): () => void {
  listeners.add(listener);
  function onStorage(event: StorageEvent) {
    if (event.key === FAVORITES_STORAGE_KEY || event.key === null) listener();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
