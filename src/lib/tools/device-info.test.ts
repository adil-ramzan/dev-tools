// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { FEATURES, buildReport, formatOffset, readSnapshot, reportToJson, reportToText, type DeviceSnapshot, type FeatureKey } from "@/lib/tools/device-info";

const snapshot: DeviceSnapshot = {
  viewport: { width: 1280, height: 720 },
  screen: { width: 1440, height: 900, availWidth: 1440, availHeight: 875, colorDepth: 24, orientation: "landscape-primary" },
  devicePixelRatio: 2,
  language: "en-GB",
  languages: ["en-GB", "en"],
  timeZone: "Europe/London",
  utcOffsetMinutes: 60,
  online: true,
  connection: { effectiveType: "4g", downlink: 10, rtt: 50, saveData: false },
  hardwareConcurrency: 8,
  deviceMemory: 8,
  maxTouchPoints: 0,
  media: { pointer: "Precise (mouse, trackpad or stylus)", hover: true, colorScheme: "dark", reducedMotion: false, highContrast: false },
  cookiesEnabled: true,
  userAgent: "Mozilla/5.0 Test",
  features: Object.fromEntries(Object.keys(FEATURES).map((k) => [k, k !== "usb"])) as Record<FeatureKey, boolean>,
};

const find = (label: string, s = snapshot) => buildReport(s).flatMap((x) => x.rows).find((r) => r.label === label);

describe("buildReport", () => {
  it("labels values as reported, estimated or detected", () => {
    expect(find("Viewport (browser window content)")).toMatchObject({ value: "1280 × 720 CSS pixels", kind: "reported" });
    expect(find("Device pixel ratio")).toMatchObject({ value: "2", kind: "reported" });
    expect(find("Screen resolution in device pixels")).toMatchObject({ value: "2880 × 1800", kind: "estimate" });
    expect(find("Device memory")).toMatchObject({ value: "About 8 GB", kind: "estimate" });
    expect(find("Connection quality")).toMatchObject({ value: "4G", kind: "estimate" });
    expect(find("Time zone")).toMatchObject({ value: "Europe/London", kind: "reported" });
    expect(find("UTC offset")?.value).toBe("UTC+01:00");
    expect(find("WebUSB")).toMatchObject({ value: "Not available", kind: "detected" });
    expect(find("WebAssembly")).toMatchObject({ value: "Available" });
  });

  it("says when something is not reported instead of guessing", () => {
    const sparse: DeviceSnapshot = { ...snapshot, connection: null, deviceMemory: null, hardwareConcurrency: null, timeZone: null, languages: [] };
    expect(find("Connection details", sparse)).toMatchObject({ value: "Not available in this browser" });
    expect(find("Device memory", sparse)?.value).toBe("Not reported");
    expect(find("Logical processors", sparse)?.value).toBe("Not reported");
    expect(find("Time zone", sparse)?.value).toBe("Not reported");
    expect(find("Preferred languages", sparse)?.value).toBe("Not reported");
  });

  it("contains no hardware identifiers", () => {
    const text = reportToText(buildReport(snapshot)).toLowerCase();
    for (const word of ["serial", "mac address", "imei", "device id", "fingerprint"]) expect(text).not.toContain(word);
  });

  it("exports text and JSON", () => {
    const sections = buildReport(snapshot);
    expect(reportToText(sections)).toContain("## Display\nViewport (browser window content): 1280 × 720 CSS pixels (reported)");
    const json = JSON.parse(reportToJson(sections));
    expect(json.Display["Device pixel ratio"]).toEqual({ value: "2", kind: "reported" });
  });

  it("formats UTC offsets", () => {
    expect(formatOffset(0)).toBe("UTC+00:00");
    expect(formatOffset(330)).toBe("UTC+05:30");
    expect(formatOffset(-240)).toBe("UTC−04:00");
  });
});

describe("readSnapshot", () => {
  it("reads the browser environment without throwing", () => {
    const s = readSnapshot(window);
    expect(s.viewport.width).toBe(window.innerWidth);
    expect(s.timeZone).toBe("America/New_York");
    expect(typeof s.online).toBe("boolean");
    expect(Object.keys(s.features).sort()).toEqual(Object.keys(FEATURES).sort());
    expect(buildReport(s).length).toBeGreaterThan(5);
  });
});
