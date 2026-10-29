"use client";

import { useEffect } from "react";
import { buttonClassName } from "@/components/ui/Button";
import {
  THEME_STORAGE_KEY,
  applyThemePreference,
  oppositeTheme,
  parseThemePreference,
  readResolvedTheme,
  readThemePreference,
  watchSystemTheme,
  type ResolvedTheme,
} from "@/lib/theme";

const labels: Record<ResolvedTheme, string> = {
  light: "Theme: light. Switch to dark theme",
  dark: "Theme: dark. Switch to light theme",
};

/**
 * Switches between light and dark on every click and stores the choice;
 * before the first click the system theme is shown. The visible icon and
 * accessible label show the current theme and are chosen in CSS from
 * `data-theme` on <html>, which the head script sets before paint, so the
 * server-rendered markup never mismatches.
 */
export function ThemeToggle() {
  useEffect(() => {
    const stopWatching = watchSystemTheme(() => {
      if (readThemePreference() === "system") applyThemePreference("system", { persist: false });
    });
    function onStorage(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        applyThemePreference(parseThemePreference(event.newValue), { persist: false });
      }
    }
    window.addEventListener("storage", onStorage);
    return () => {
      stopWatching();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <button
      type="button"
      className={buttonClassName({ variant: "ghost", size: "icon", className: "theme-toggle" })}
      onClick={() => applyThemePreference(oppositeTheme(readResolvedTheme()))}
    >
      {(Object.keys(labels) as ResolvedTheme[]).map((theme) => (
        <span key={theme} data-theme-option={theme} className="items-center">
          <ThemeIcon theme={theme} />
          <span className="sr-only">{labels[theme]}</span>
        </span>
      ))}
    </button>
  );
}

function ThemeIcon({ theme }: { theme: ResolvedTheme }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };

  if (theme === "dark") {
    return (
      <svg {...common}>
        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
