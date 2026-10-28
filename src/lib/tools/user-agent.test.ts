import { beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_USER_AGENTS, loadBowser, parseUserAgent } from "@/lib/tools/user-agent";

let bowser: Awaited<ReturnType<typeof loadBowser>>;
beforeAll(async () => {
  bowser = await loadBowser();
});
const report = (ua: string) => {
  const result = parseUserAgent(ua, bowser);
  if (!result.ok) throw new Error(result.error);
  return result.report;
};
const sample = (label: string) => SAMPLE_USER_AGENTS.find((s) => s.label === label)!.ua;

describe("parseUserAgent", () => {
  it("recognizes desktop Chrome on Windows and explains reduced details", () => {
    const r = report(sample("Chrome on Windows"));
    expect(r).toMatchObject({ browser: { name: "Chrome", version: "129.0.0.0" }, engine: { name: "Blink" }, os: { name: "Windows" }, platform: { type: "desktop" }, isBot: false });
    expect(r.notes.join(" ")).toMatch(/Windows 10 and 11/);
    expect(r.notes.join(" ")).toMatch(/reduced version/);
  });

  it("recognizes Safari on iPhone", () => {
    expect(report(sample("Safari on iPhone"))).toMatchObject({ browser: { name: "Safari", version: "17.5" }, engine: { name: "WebKit" }, os: { name: "iOS", version: "17.5" }, platform: { type: "mobile", vendor: "Apple", model: "iPhone" } });
  });

  it("recognizes Firefox, Edge and Android", () => {
    expect(report(sample("Firefox on Linux"))).toMatchObject({ browser: { name: "Firefox" }, engine: { name: "Gecko" }, os: { name: "Linux" } });
    expect(report(sample("Edge on macOS"))).toMatchObject({ browser: { name: "Microsoft Edge" }, os: { name: "macOS" } });
    const android = report(sample("Chrome on Android"));
    expect(android).toMatchObject({ os: { name: "Android" }, platform: { type: "mobile" } });
    expect(android.notes.join(" ")).toMatch(/"K"/);
  });

  it("flags bots, headless browsers and command-line tools", () => {
    expect(report(sample("Googlebot"))).toMatchObject({ isBot: true, platform: { type: "bot" } });
    const headless = report("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/129.0.0.0 Safari/537.36");
    expect(headless.isBot).toBe(true);
    expect(headless.notes.join(" ")).toMatch(/automated browser/);
    expect(report(sample("curl")).notes.join(" ")).toMatch(/command-line tool/);
  });

  it("returns empty fields for unknown strings instead of guessing", () => {
    const r = report("SomethingNew");
    expect(r.browser.name).toBe("");
    expect(r.notes.join(" ")).toMatch(/No known browser/);
  });

  it("rejects empty, overlong and multi-line input", () => {
    expect(parseUserAgent("   ", bowser).ok).toBe(false);
    expect(parseUserAgent("a".repeat(2049), bowser).ok).toBe(false);
    expect(parseUserAgent("Mozilla/5.0\r\nX-Injected: 1", bowser).ok).toBe(false);
  });

  it("parses every sample", () => {
    for (const { ua } of SAMPLE_USER_AGENTS) expect(parseUserAgent(ua, bowser).ok).toBe(true);
  });
});
