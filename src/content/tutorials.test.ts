import { describe, expect, it } from "vitest";
import { getToolBySlug } from "@/content/tools";
import { getTutorialBySlug, tutorialPath, tutorials, tutorialsForTool } from "@/content/tutorials";
import { encodeHtmlEntities, decodeHtmlEntities } from "@/lib/tools/html-entities";
import { analyzeHeaders } from "@/lib/tools/http-headers";
import { calculateSubnet, formatIpv4, parseCidr } from "@/lib/tools/ipv4";
import { parseJson } from "@/lib/tools/json";
import { DEFAULT_PASSWORD_SETTINGS, passwordEntropy, strengthFor, type PasswordSettings } from "@/lib/tools/password";

const tutorial = (slug: string) => {
  const found = getTutorialBySlug(slug);
  if (!found) throw new Error(`Missing tutorial ${slug}`);
  return found;
};

describe("tutorial registry", () => {
  it("has unique, URL-safe slugs and titles", () => {
    expect(new Set(tutorials.map((t) => t.slug)).size).toBe(tutorials.length);
    expect(new Set(tutorials.map((t) => t.title)).size).toBe(tutorials.length);
    for (const t of tutorials) expect(t.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(tutorialPath("format-validate-json")).toBe("/tutorials/format-validate-json");
  });

  it("links only to available tools, from the tutorial and from each step", () => {
    for (const t of tutorials) {
      expect(t.tools.length, t.slug).toBeGreaterThan(0);
      for (const slug of [...t.tools, ...t.steps.flatMap((s) => (s.tool ? [s.tool] : []))]) {
        expect(getToolBySlug(slug)?.status, `${t.slug} → ${slug}`).toBe("available");
      }
      for (const step of t.steps) {
        if (step.tool) expect(t.tools, `${t.slug}: step tool ${step.tool} is listed`).toContain(step.tool);
      }
    }
  });

  it("has substantial content: steps, an example, mistakes and a unique meta description", () => {
    for (const t of tutorials) {
      expect(t.steps.length, t.slug).toBeGreaterThanOrEqual(3);
      expect(t.mistakes.length, t.slug).toBeGreaterThanOrEqual(3);
      expect(t.example.input && t.example.output, t.slug).toBeTruthy();
      expect(t.metaDescription.length, t.slug).toBeLessThanOrEqual(170);
    }
    expect(new Set(tutorials.map((t) => t.metaDescription)).size).toBe(tutorials.length);
  });

  it("finds the tutorials for a tool", () => {
    expect(tutorialsForTool("ipv4-subnet-calculator").map((t) => t.slug)).toEqual(["calculate-ipv4-subnet"]);
    expect(tutorialsForTool("uuid-generator")).toEqual([]);
  });
});

// The worked examples are recomputed with the tools' own logic, so a tutorial cannot drift from the tool.
describe("tutorial examples match the tools", () => {
  it("IPv4 subnet", () => {
    const t = tutorial("calculate-ipv4-subnet");
    const cidr = parseCidr(t.example.input);
    if (!cidr.ok) throw new Error(cidr.error);
    const s = calculateSubnet(cidr.address, cidr.prefix);
    const expected = [
      `Network      ${formatIpv4(s.network)}/${s.prefix}`,
      `Subnet mask  ${formatIpv4(s.mask)}`,
      `Wildcard     ${formatIpv4(s.wildcard)}`,
      `Broadcast    ${formatIpv4(s.broadcast)}`,
      `Usable       ${formatIpv4(s.firstUsable)} – ${formatIpv4(s.lastUsable)}`,
      `Hosts        ${s.usable} (${s.total} addresses)`,
    ].join("\n");
    expect(t.example.output).toBe(expected);
    // The steps quote the same numbers.
    const steps = t.steps.flatMap((step) => step.body).join(" ");
    for (const value of ["10.20.30.32", "10.20.30.63", "10.20.30.33", "10.20.30.62"]) expect(steps).toContain(value);
    expect(parseCidr("192.168.1.010/24").ok).toBe(false);
  });

  it("HTTP headers", () => {
    const t = tutorial("inspect-http-headers");
    const labels = { error: "Error", warning: "Warning", info: "Info", ok: "OK" } as const;
    const findings = analyzeHeaders(t.example.input, { https: true }).findings;
    expect(t.example.output).toBe(findings.map((f) => `${labels[f.severity].padEnd(8)} ${f.title}`).join("\n"));
  });

  it("password entropy", () => {
    const t = tutorial("generate-secure-passwords");
    const rows: Partial<PasswordSettings>[] = [{ length: 8 }, { length: 12 }, { length: 16 }, { length: 20 }, { length: 16, sets: ["lowercase", "numbers"] }];
    const expected = rows.map((row) => {
      const bits = Math.floor(passwordEntropy({ ...DEFAULT_PASSWORD_SETTINGS, ...row }));
      return `${`${bits} bits`.padEnd(9)} ${strengthFor(bits).label}`;
    });
    expect(t.example.output).toBe(expected.join("\n"));
    expect(DEFAULT_PASSWORD_SETTINGS.length).toBe(20);
  });

  it("HTML entities", async () => {
    const t = tutorial("encode-decode-html-entities");
    const lib = await import("entities");
    const encoded = encodeHtmlEntities(t.example.input, { nonAscii: "keep", doubleEncode: false }, lib);
    expect(encoded.ok && encoded.output).toBe(t.example.output);
    // Claims made in the steps.
    const keep = encodeHtmlEntities("Tom &amp; Jerry <3", { nonAscii: "keep", doubleEncode: false }, lib);
    expect(keep.ok && keep.output).toBe("Tom &amp; Jerry &lt;3");
    const named = encodeHtmlEntities("Café", { nonAscii: "named", doubleEncode: false }, lib);
    expect(named.ok && named.output).toBe("Caf&eacute;");
    const numeric = encodeHtmlEntities("Café", { nonAscii: "numeric", doubleEncode: false }, lib);
    expect(numeric.ok && numeric.output).toBe("Caf&#xE9;");
    const decoded = decodeHtmlEntities("&#8212; &#x2014; &foo;", { strict: false }, lib);
    expect(decoded.ok && decoded.output).toBe("— — &foo;");
  });

  it("JSON", () => {
    const t = tutorial("format-validate-json");
    const result = parseJson(t.example.input);
    if (result.ok) throw new Error("expected invalid JSON");
    const { line, column, message } = result.error;
    expect(t.example.output).toBe(`Invalid JSON: line ${line}, column ${column}\n${message}.`);
  });
});
