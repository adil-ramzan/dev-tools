import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";
import { convertData, type ConvertResult, type DataFormat } from "@/lib/tools/data-format";

async function convert(text: string, from: DataFormat, to: DataFormat) {
  const result = await convertData(text, from, to);
  if (!result.ok) throw new Error(result.error);
  return result;
}
const failure = (result: ConvertResult) => (result.ok ? null : result);

const SAMPLE_JSON = `{
  "name": "app",
  "version": 3,
  "ratio": 1.0,
  "enabled": true,
  "tags": ["a", "b"],
  "server": { "host": "localhost", "ports": [80, 443] },
  "owners": [{ "name": "Ada" }, { "name": "Lin" }]
}`;

describe("JSON → YAML and TOML", () => {
  it("converts to YAML that parses back to the same data", async () => {
    const { output, warnings } = await convert(SAMPLE_JSON, "json", "yaml");
    expect(parseYaml(output)).toEqual(JSON.parse(SAMPLE_JSON));
    expect(output).toContain("ratio: 1.0");
    expect(warnings).toEqual([]);
  });

  it("converts to TOML that parses back to the same data", async () => {
    const { output } = await convert(SAMPLE_JSON, "json", "toml");
    expect(output).toContain("ratio = 1.0");
    expect(output).toContain("version = 3\n");
    expect(output).toContain("[[owners]]");
    expect(JSON.parse(JSON.stringify(parseToml(output)))).toEqual(JSON.parse(SAMPLE_JSON));
  });

  it("refuses to drop null values when converting to TOML", async () => {
    const result = failure(await convertData('{"a": 1, "b": null, "c": [1, null]}', "json", "toml"));
    expect(result?.error).toMatch(/TOML has no null value: \$\.b, \$\.c\[1\]/);
  });

  it("requires a table at the top level of TOML", async () => {
    expect(failure(await convertData("[1, 2]", "json", "toml"))?.error).toMatch(/must be a table/);
    expect(failure(await convertData('"text"', "json", "toml"))?.error).toMatch(/single value/);
  });

  it("rejects TOML integers that do not fit in 64 bits", async () => {
    expect(failure(await convertData('{"n": 99999999999999999999}', "json", "toml"))?.error).toMatch(/64 bits: \$\.n/);
  });

  it("keeps large integers exact and warns about JSON parsers", async () => {
    const yaml = await convert('{"id": 9007199254740993}', "json", "yaml");
    expect(yaml.output).toContain("id: 9007199254740993");
    const json = await convert("id: 9007199254740993", "yaml", "json");
    expect(json.output).toContain("9007199254740993");
    expect(json.warnings[0]).toMatch(/round them: \$\.id/);
  });

  it("reports duplicate JSON keys instead of keeping the last one", async () => {
    expect(failure(await convertData('{"a": 1, "a": 2}', "json", "yaml"))?.error).toMatch(/duplicate/i);
  });

  it("reports JSON syntax errors with a position", async () => {
    expect(failure(await convertData('{"a": }', "json", "yaml"))).toMatchObject({ line: 1, column: 7 });
  });

  it("quotes strings YAML 1.1 parsers would read as booleans", async () => {
    const { output } = await convert('{"answer": "yes", "off": "off", "n": "1.0", "date": "2024-01-01"}', "json", "yaml");
    expect(output).toContain('answer: "yes"');
    expect(output).toContain('off: "off"');
    expect(parseYaml(output)).toEqual({ answer: "yes", off: "off", n: "1.0", date: "2024-01-01" });
  });

  it("keeps __proto__ as an ordinary key", async () => {
    const { output } = await convert('{"__proto__": {"x": 1}, "a": 2}', "json", "toml");
    expect(output).toContain("__proto__");
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe("YAML → JSON and TOML", () => {
  it("converts YAML to JSON", async () => {
    const { output } = await convert("name: app\nlist:\n  - 1\n  - 2.5\n  - true\n  - null\nhex: 0x1F\n", "yaml", "json");
    expect(JSON.parse(output)).toEqual({ name: "app", list: [1, 2.5, true, null], hex: 31 });
  });

  it("expands aliases with a warning", async () => {
    const result = await convert("base: &b { x: 1 }\ncopy: *b\n", "yaml", "json");
    expect(JSON.parse(result.output)).toEqual({ base: { x: 1 }, copy: { x: 1 } });
    expect(result.warnings.join(" ")).toMatch(/Aliases.*\$\.copy/);
  });

  it("stops alias bombs", async () => {
    const bomb = ["a: &a [x, x, x, x, x, x, x, x, x, x]"];
    for (let i = 1; i < 9; i++) bomb.push(`${String.fromCharCode(97 + i)}: &${String.fromCharCode(97 + i)} [${Array(10).fill(`*${String.fromCharCode(96 + i)}`).join(", ")}]`);
    const start = performance.now();
    expect(failure(await convertData(bomb.join("\n"), "yaml", "json"))?.error).toMatch(/Expanding the aliases/);
    // Rejected quickly, so the page does not freeze.
    expect(performance.now() - start).toBeLessThan(1500);
  });

  it("still converts large documents without aliases", async () => {
    const big = Array.from({ length: 20_000 }, (_, i) => `k${i}: [${i}, ${i + 1}]`).join("\n");
    const start = performance.now();
    const result = await convert(big, "yaml", "json");
    expect(JSON.parse(result.output).k19999).toEqual([19999, 20000]);
    expect(performance.now() - start).toBeLessThan(3000);
  });

  it("converts non-string keys with a warning and rejects collection keys", async () => {
    const result = await convert("1: one\ntrue: yes\n", "yaml", "json");
    expect(JSON.parse(result.output)).toEqual({ "1": "one", true: "yes" });
    expect(result.warnings.join(" ")).toMatch(/not strings/);
    expect(failure(await convertData("? [1, 2]\n: x\n", "yaml", "json"))?.error).toMatch(/key that is a list or map/);
  });

  it("rejects multiple documents and reports syntax errors with a position", async () => {
    expect(failure(await convertData("a: 1\n---\nb: 2\n", "yaml", "json"))?.error).toMatch(/2 YAML documents/);
    const error = failure(await convertData("a: [1, 2\nb: 3\n", "yaml", "json"));
    expect(error?.line).toBeGreaterThan(0);
  });

  it("rejects duplicate keys", async () => {
    expect(failure(await convertData("a: 1\na: 2\n", "yaml", "json"))?.error).toMatch(/unique/);
    expect(failure(await convertData("outer:\n  b: 1\n  b: 2\n", "yaml", "json"))?.error).toMatch(/"b" appears more than once at \$\.outer/);
    expect(failure(await convertData('1: a\n"1": b\n', "yaml", "json"))?.error).toMatch(/after converting keys to strings/);
  });

  it("warns that comments are dropped", async () => {
    expect((await convert("# settings\na: 1 # one\n", "yaml", "json")).warnings).toContain("Comments are not carried over to the output.");
  });

  it("rejects NaN and infinity in JSON output", async () => {
    expect(failure(await convertData("a: .inf\nb: .nan\n", "yaml", "json"))?.error).toMatch(/NaN or infinity: \$\.a, \$\.b/);
    expect((await convert("a: .inf\n", "yaml", "toml")).output).toContain("a = inf");
  });

  it("converts an empty document to null", async () => {
    expect((await convert("# only a comment\n", "yaml", "json")).output).toBe("null\n");
  });
});

describe("TOML → JSON and YAML", () => {
  const TOML = `title = "Example"
float = 1.0

[owner]
dob = 1979-05-27T07:32:00-08:00
day = 1979-05-27
alarm = 07:32:00

[[products]]
name = "Hammer"
sku = 738594937
`;

  it("converts TOML to JSON, turning dates into strings with a warning", async () => {
    const { output, warnings } = await convert(TOML, "toml", "json");
    expect(JSON.parse(output)).toEqual({
      title: "Example",
      float: 1,
      owner: { dob: "1979-05-27T07:32:00.000-08:00", day: "1979-05-27", alarm: "07:32:00.000" },
      products: [{ name: "Hammer", sku: 738594937 }],
    });
    expect(output).toContain('"float": 1.0');
    expect(warnings.join(" ")).toMatch(/dates and times became strings/);
  });

  it("round-trips TOML through JSON with value types intact except dates", async () => {
    const json = await convert('a = 1\nb = 1.5\nc = [1, "x", true]\n', "toml", "json");
    const back = await convert(json.output, "json", "toml");
    expect(parseToml(back.output)).toEqual(parseToml('a = 1\nb = 1.5\nc = [1, "x", true]\n'));
  });

  it("reports TOML syntax errors with a position", async () => {
    expect(failure(await convertData("a = \n", "toml", "json"))).toMatchObject({ line: 1 });
  });

  it("converts TOML to YAML", async () => {
    const { output } = await convert(TOML, "toml", "yaml");
    expect(parseYaml(output)).toMatchObject({ title: "Example", owner: { day: "1979-05-27" } });
  });
});

describe("input checks", () => {
  it("requires input", async () => {
    expect((await convertData("   ", "json", "yaml")).ok).toBe(false);
  });

  it("converts to the same format as a normalizer", async () => {
    expect((await convert('{"a":1}', "json", "json")).output).toBe('{\n  "a": 1\n}\n');
  });
});
