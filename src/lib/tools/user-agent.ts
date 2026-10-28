/**
 * User-agent parsing with Bowser (MIT), loaded only on this tool's page.
 *
 * A user-agent string is self-reported text: any client can send any string,
 * browsers deliberately reduce or freeze parts of it (Chrome reports
 * "Windows NT 10.0" for Windows 11, and a fixed minor version), and new
 * browsers and devices appear before parsers know them. Results are
 * best-effort labels, not facts about the device.
 */

export const MAX_UA_LENGTH = 2048;

type Bowser = typeof import("bowser");

export function loadBowser(): Promise<Bowser> {
  // Bowser is CommonJS (export =); bundlers expose it as the default export.
  return import("bowser").then((m) => ((m as { default?: Bowser }).default ?? m) as Bowser);
}

export type UaField = { name: string; version: string };

export type UaReport = {
  browser: UaField;
  engine: UaField;
  os: UaField & { versionName: string };
  platform: { type: string; vendor: string; model: string };
  isBot: boolean;
  notes: string[];
};

export type UaResult = { ok: true; report: UaReport } | { ok: false; error: string };

export const PLATFORM_LABELS: Record<string, string> = { desktop: "Desktop", mobile: "Mobile", tablet: "Tablet", tv: "TV", bot: "Bot or crawler" };

export function parseUserAgent(input: string, bowser: Bowser): UaResult {
  const ua = input.trim();
  if (ua === "") return { ok: false, error: "Paste a user-agent string, or select Use my browser." };
  if (ua.length > MAX_UA_LENGTH) return { ok: false, error: `The string is longer than ${MAX_UA_LENGTH.toLocaleString("en-US")} characters, which is far longer than any real user agent.` };
  if (/[\u0000-\u001f\u007f]/.test(ua)) return { ok: false, error: "The string contains line breaks or other control characters, which a User-Agent header cannot contain. Paste a single line." };

  let result: ReturnType<ReturnType<Bowser["getParser"]>["getResult"]>;
  try {
    result = bowser.getParser(ua).getResult();
  } catch (error) {
    return { ok: false, error: `The string could not be parsed: ${error instanceof Error ? error.message : String(error)}` };
  }

  const notes: string[] = [];
  const isBot = result.platform.type === "bot" || /bot|crawler|spider|slurp|facebookexternalhit|headless/i.test(ua);
  if (/HeadlessChrome/.test(ua)) notes.push("HeadlessChrome means an automated browser, such as a test runner or scraper.");
  if (!result.browser.name && !result.os.name) {
    notes.push(/^[\w.-]+\/[\w.-]+(\s|$)/.test(ua) ? "This looks like a command-line tool or library (name/version) rather than a browser." : "No known browser or operating system was recognized.");
  }
  if (/Windows NT 10\.0/.test(ua)) notes.push("Windows 10 and 11 both report \"Windows NT 10.0\"; the user-agent string cannot tell them apart.");
  if (/Chrome\/\d+\.0\.0\.0/.test(ua)) notes.push("Chromium-based browsers report a reduced version (major.0.0.0) and a frozen platform, so details are deliberately vague.");
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Firefox/.test(ua)) notes.push("iPads in desktop mode send a Mac user-agent, so this could also be an iPad.");
  if (/Android/.test(ua) && /\bK\b/.test(ua)) notes.push("Android Chrome reports the device model as \"K\" to reduce fingerprinting.");

  return {
    ok: true,
    report: {
      browser: { name: result.browser.name ?? "", version: result.browser.version ?? "" },
      engine: { name: result.engine.name ?? "", version: result.engine.version ?? "" },
      os: { name: result.os.name ?? "", version: result.os.version ?? "", versionName: result.os.versionName ?? "" },
      platform: { type: isBot ? "bot" : (result.platform.type ?? ""), vendor: result.platform.vendor ?? "", model: result.platform.model ?? "" },
      isBot,
      notes,
    },
  };
}

export const SAMPLE_USER_AGENTS: { label: string; ua: string }[] = [
  { label: "Chrome on Windows", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36" },
  { label: "Safari on iPhone", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" },
  { label: "Firefox on Linux", ua: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0" },
  { label: "Chrome on Android", ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36" },
  { label: "Edge on macOS", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0" },
  { label: "Googlebot", ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
  { label: "curl", ua: "curl/8.4.0" },
];
