/**
 * Theme handling. The toggle offers two themes, light and dark; the choice is
 * stored in localStorage. Until a visitor chooses, the preference is "system":
 * nothing is stored and the operating system's theme is used. Both are written
 * to <html> as data attributes: `data-theme` drives the color tokens and the
 * toggle's icon and label, `data-theme-preference` records whether a choice
 * was made.
 */

export const THEME_STORAGE_KEY = "theme";

export const themePreferences = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedTheme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function parseResolvedTheme(value: string | null | undefined): ResolvedTheme {
  return value === "dark" ? "dark" : "light";
}

/** The theme the toggle switches to: always the opposite of the theme on screen, so every click changes it. */
export function oppositeTheme(current: ResolvedTheme): ResolvedTheme {
  return current === "dark" ? "light" : "dark";
}

export function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

export function watchSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function readThemePreference(): ThemePreference {
  return parseThemePreference(document.documentElement.dataset.themePreference);
}

/** The theme currently shown. */
export function readResolvedTheme(): ResolvedTheme {
  return parseResolvedTheme(document.documentElement.dataset.theme);
}

/** Applies a preference to <html> and, unless `persist` is false, stores it. */
export function applyThemePreference(preference: ThemePreference, { persist = true } = {}): void {
  const resolved: ResolvedTheme =
    preference === "system" ? (systemPrefersDark() ? "dark" : "light") : preference;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;

  if (!persist) return;
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage unavailable (private mode, blocked): the choice lasts for this page only.
  }
}

/**
 * Runs in <head> before first paint so the saved theme is applied without a
 * flash. Must stay self-contained ES5; it mirrors `applyThemePreference`.
 * If it fails, CSS falls back to `prefers-color-scheme`.
 */
export const themeInitScript = `(function(){var d=document.documentElement,p=null;try{p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})}catch(e){}if(p!=="light"&&p!=="dark")p="system";try{d.dataset.theme=p==="system"?(window.matchMedia(${JSON.stringify(
  DARK_QUERY,
)}).matches?"dark":"light"):p}catch(e){}d.dataset.themePreference=p})()`;
