/**
 * Information the browser reports about the current device and window.
 *
 * Everything comes from standard web APIs on this page and stays in the
 * browser. Each value is labelled:
 *
 * - "reported": read directly from an API. Browsers may round, cap or
 *   deliberately alter these values to protect privacy.
 * - "estimate": a coarse or derived figure, such as approximate memory or a
 *   network speed estimate.
 * - "detected": whether a feature exists. Nothing is requested: no
 *   permission prompts, no location, camera or clipboard access.
 *
 * No hardware identifiers (serial numbers, MAC addresses, unique device IDs)
 * are available to web pages, and none are shown.
 */

export type ValueKind = "reported" | "estimate" | "detected";

export type DeviceSnapshot = {
  viewport: { width: number; height: number };
  screen: { width: number; height: number; availWidth: number; availHeight: number; colorDepth: number; orientation: string | null };
  devicePixelRatio: number;
  language: string;
  languages: string[];
  timeZone: string | null;
  /** Minutes east of UTC, as shown for the current date. */
  utcOffsetMinutes: number;
  online: boolean;
  connection: { effectiveType: string | null; downlink: number | null; rtt: number | null; saveData: boolean | null } | null;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  maxTouchPoints: number;
  media: { pointer: string; hover: boolean; colorScheme: "dark" | "light"; reducedMotion: boolean; highContrast: boolean };
  cookiesEnabled: boolean;
  userAgent: string;
  features: Record<FeatureKey, boolean>;
};

export const FEATURES = {
  webCrypto: "Web Crypto (secure random numbers, hashing)",
  webAssembly: "WebAssembly",
  serviceWorker: "Service workers (offline support)",
  webgl: "WebGL",
  webgl2: "WebGL 2",
  webgpu: "WebGPU",
  indexedDb: "IndexedDB",
  clipboard: "Async Clipboard API",
  share: "Web Share API",
  notifications: "Notifications API",
  geolocation: "Geolocation API",
  mediaDevices: "Camera and microphone API",
  bluetooth: "Web Bluetooth",
  usb: "WebUSB",
  vibration: "Vibration API",
} as const;

export type FeatureKey = keyof typeof FEATURES;

export type InfoRow = { label: string; value: string; kind: ValueKind; note?: string };
export type InfoSection = { title: string; rows: InfoRow[] };

function plural(n: number, word: string) {
  return `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

export function buildReport(s: DeviceSnapshot): InfoSection[] {
  const dpr = s.devicePixelRatio;
  const physical = { width: Math.round(s.screen.width * dpr), height: Math.round(s.screen.height * dpr) };
  const yes = (b: boolean) => (b ? "Yes" : "No");
  const c = s.connection;

  const display: InfoRow[] = [
    { label: "Viewport (browser window content)", value: `${s.viewport.width} × ${s.viewport.height} CSS pixels`, kind: "reported", note: "Changes when you resize the window or zoom." },
    { label: "Screen size", value: `${s.screen.width} × ${s.screen.height} CSS pixels`, kind: "reported" },
    { label: "Available screen area", value: `${s.screen.availWidth} × ${s.screen.availHeight} CSS pixels`, kind: "reported", note: "The screen minus taskbars and docks." },
    { label: "Device pixel ratio", value: String(Math.round(dpr * 1000) / 1000), kind: "reported", note: "Includes browser zoom, so it changes as you zoom in or out." },
    { label: "Screen resolution in device pixels", value: `${physical.width} × ${physical.height}`, kind: "estimate", note: "Screen size multiplied by the pixel ratio. With zoom or display scaling this can differ from the panel's native resolution." },
    { label: "Colour depth", value: `${s.screen.colorDepth}-bit`, kind: "reported" },
  ];
  if (s.screen.orientation) display.push({ label: "Orientation", value: s.screen.orientation, kind: "reported" });

  const locale: InfoRow[] = [
    { label: "Language", value: s.language || "Not reported", kind: "reported" },
    { label: "Preferred languages", value: s.languages.length ? s.languages.join(", ") : "Not reported", kind: "reported" },
    { label: "Time zone", value: s.timeZone ?? "Not reported", kind: "reported" },
    { label: "UTC offset", value: formatOffset(s.utcOffsetMinutes), kind: "reported", note: "For today; it changes with daylight saving time." },
  ];

  const network: InfoRow[] = [
    { label: "Online", value: s.online ? "Yes" : "No", kind: "reported", note: "“Yes” means a network connection exists, not that the internet is reachable." },
  ];
  if (c) {
    if (c.effectiveType) network.push({ label: "Connection quality", value: c.effectiveType.toUpperCase(), kind: "estimate", note: "The browser's guess from recent traffic, not the actual network type." });
    if (c.downlink !== null) network.push({ label: "Downlink speed", value: `About ${c.downlink} Mbit/s`, kind: "estimate", note: "Rounded and capped by the browser." });
    if (c.rtt !== null) network.push({ label: "Round-trip time", value: `About ${c.rtt} ms`, kind: "estimate" });
    if (c.saveData !== null) network.push({ label: "Data Saver", value: c.saveData ? "On" : "Off", kind: "reported" });
  } else {
    network.push({ label: "Connection details", value: "Not available in this browser", kind: "detected" });
  }

  const hardware: InfoRow[] = [
    {
      label: "Logical processors",
      value: s.hardwareConcurrency ? String(s.hardwareConcurrency) : "Not reported",
      kind: "reported",
      note: "Threads available to the browser; some browsers report a fixed or capped number.",
    },
    {
      label: "Device memory",
      value: s.deviceMemory ? `About ${s.deviceMemory} GB` : "Not reported",
      kind: "estimate",
      note: "Rounded to a coarse value and capped (usually at 8 GB) on purpose. Only some browsers report it.",
    },
    { label: "Touch points", value: s.maxTouchPoints ? plural(s.maxTouchPoints, "point") : "No touch screen reported", kind: "reported" },
    { label: "Main pointer", value: s.media.pointer, kind: "reported" },
    { label: "Hover", value: yes(s.media.hover), kind: "reported" },
  ];

  const preferences: InfoRow[] = [
    { label: "Colour scheme", value: s.media.colorScheme === "dark" ? "Dark" : "Light", kind: "reported" },
    { label: "Reduced motion", value: yes(s.media.reducedMotion), kind: "reported" },
    { label: "More contrast", value: yes(s.media.highContrast), kind: "reported" },
    { label: "Cookies enabled", value: yes(s.cookiesEnabled), kind: "reported" },
  ];

  const features: InfoRow[] = (Object.keys(FEATURES) as FeatureKey[]).map((key) => ({
    label: FEATURES[key],
    value: s.features[key] ? "Available" : "Not available",
    kind: "detected",
  }));

  const browser: InfoRow[] = [
    { label: "User agent", value: s.userAgent || "Not reported", kind: "reported", note: "Browsers reduce or freeze parts of this string, and it can be changed, so treat it as a hint." },
  ];

  return [
    { title: "Display", rows: display },
    { title: "Language and time", rows: locale },
    { title: "Network", rows: network },
    { title: "Hardware", rows: hardware },
    { title: "Preferences", rows: preferences },
    { title: "Browser features", rows: features },
    { title: "Browser", rows: browser },
  ];
}

export const KIND_LABELS: Record<ValueKind, string> = { reported: "Reported", estimate: "Estimate", detected: "Detected" };

export function reportToText(sections: InfoSection[]): string {
  return sections
    .map((section) => [`## ${section.title}`, ...section.rows.map((r) => `${r.label}: ${r.value} (${KIND_LABELS[r.kind].toLowerCase()})`)].join("\n"))
    .join("\n\n");
}

export function reportToJson(sections: InfoSection[]): string {
  return JSON.stringify(
    Object.fromEntries(sections.map((s) => [s.title, Object.fromEntries(s.rows.map((r) => [r.label, { value: r.value, kind: r.kind }]))])),
    null,
    2,
  );
}

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
  gpu?: unknown;
  bluetooth?: unknown;
  usb?: unknown;
};

function canvasSupports(doc: Document, context: "webgl" | "webgl2"): boolean {
  try {
    return Boolean(doc.createElement("canvas").getContext(context));
  } catch {
    return false;
  }
}

/** Reads the current values from the browser. Nothing is stored or sent anywhere. */
export function readSnapshot(win: Window = window): DeviceSnapshot {
  const nav = win.navigator as NavigatorExtras;
  const media = (query: string) => {
    try {
      return win.matchMedia?.(query).matches ?? false;
    } catch {
      return false;
    }
  };
  let timeZone: string | null = null;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    timeZone = null;
  }
  const conn = nav.connection;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  return {
    viewport: { width: win.innerWidth, height: win.innerHeight },
    screen: {
      width: win.screen?.width ?? 0,
      height: win.screen?.height ?? 0,
      availWidth: win.screen?.availWidth ?? 0,
      availHeight: win.screen?.availHeight ?? 0,
      colorDepth: win.screen?.colorDepth ?? 0,
      orientation: win.screen?.orientation?.type ?? null,
    },
    devicePixelRatio: win.devicePixelRatio || 1,
    language: nav.language ?? "",
    languages: [...(nav.languages ?? [])],
    timeZone,
    utcOffsetMinutes: -new Date().getTimezoneOffset(),
    online: nav.onLine,
    connection: conn
      ? { effectiveType: conn.effectiveType ?? null, downlink: num(conn.downlink), rtt: num(conn.rtt), saveData: typeof conn.saveData === "boolean" ? conn.saveData : null }
      : null,
    hardwareConcurrency: num(nav.hardwareConcurrency) || null,
    deviceMemory: num(nav.deviceMemory),
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    media: {
      pointer: media("(pointer: fine)") ? "Precise (mouse, trackpad or stylus)" : media("(pointer: coarse)") ? "Coarse (touch)" : "None reported",
      hover: media("(hover: hover)"),
      colorScheme: media("(prefers-color-scheme: dark)") ? "dark" : "light",
      reducedMotion: media("(prefers-reduced-motion: reduce)"),
      highContrast: media("(prefers-contrast: more)"),
    },
    cookiesEnabled: nav.cookieEnabled,
    userAgent: nav.userAgent ?? "",
    features: {
      webCrypto: Boolean(win.crypto?.subtle && typeof win.crypto.getRandomValues === "function"),
      webAssembly: typeof (win as unknown as { WebAssembly?: unknown }).WebAssembly === "object",
      serviceWorker: "serviceWorker" in nav,
      webgl: canvasSupports(win.document, "webgl"),
      webgl2: canvasSupports(win.document, "webgl2"),
      webgpu: "gpu" in nav,
      indexedDb: "indexedDB" in win,
      clipboard: Boolean(nav.clipboard),
      share: typeof nav.share === "function",
      notifications: "Notification" in win,
      geolocation: "geolocation" in nav,
      mediaDevices: Boolean(nav.mediaDevices),
      bluetooth: "bluetooth" in nav,
      usb: "usb" in nav,
      vibration: typeof nav.vibrate === "function",
    },
  };
}
