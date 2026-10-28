import * as entities from "entities";
import { describe, expect, it } from "vitest";
import { decodeHtmlEntities, encodeHtmlEntities, loadEntities, type EncodeOptions } from "@/lib/tools/html-entities";

const keep: EncodeOptions = { nonAscii: "keep", doubleEncode: false };
const encode = (text: string, options: Partial<EncodeOptions> = {}) => {
  const result = encodeHtmlEntities(text, { ...keep, ...options }, entities);
  if (!result.ok) throw new Error(result.error);
  return result.output;
};
const decode = (text: string, strict = false) => {
  const result = decodeHtmlEntities(text, { strict }, entities);
  if (!result.ok) throw new Error(result.error);
  return result.output;
};

describe("encodeHtmlEntities", () => {
  it("escapes the five special characters", () => {
    expect(encode(`<a href="x" title='y'>Tom & Jerry</a>`)).toBe("&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;Tom &amp; Jerry&lt;/a&gt;");
  });

  it("keeps non-ASCII characters by default", () => {
    expect(encode("Café 😀")).toBe("Café 😀");
  });

  it("encodes non-ASCII characters as named or numeric references", () => {
    expect(encode("Café © 😀", { nonAscii: "named" })).toBe("Caf&eacute; &copy; &#x1F600;");
    expect(encode("Café 😀", { nonAscii: "numeric" })).toBe("Caf&#xE9; &#x1F600;");
  });

  it("does not double-encode existing references", () => {
    expect(encode("&amp; &lt; &#169; &#x1F600; &copy;")).toBe("&amp; &lt; &#169; &#x1F600; &copy;");
    expect(encode(encode("a < b & c"))).toBe(encode("a < b & c"));
  });

  it("escapes ampersands that are not real references", () => {
    expect(encode("&foo; &amp &#; AT&T")).toBe("&amp;foo; &amp;amp &amp;#; AT&amp;T");
  });

  it("double-encodes when asked", () => {
    expect(encode("&amp;", { doubleEncode: true })).toBe("&amp;amp;");
  });

  it("reports how many references were kept", () => {
    const result = encodeHtmlEntities("&amp; &", keep, entities);
    expect(result.ok && result.note).toMatch(/1 existing reference/);
  });

  it("rejects lone surrogates", () => {
    expect(encodeHtmlEntities("a\uD800", keep, entities).ok).toBe(false);
  });

  it("recognizes basic references without the full table", () => {
    const result = encodeHtmlEntities("&amp; &copy;", keep, null);
    expect(result.ok && result.output).toBe("&amp; &amp;copy;");
  });
});

describe("decodeHtmlEntities", () => {
  it("decodes named, decimal and hex references", () => {
    expect(decode("&lt;p&gt; &amp; &quot;x&quot; &#39;y&#x27; &copy; &#169; &#x1F600; &NotNestedGreaterGreater;")).toBe(
      "<p> & \"x\" 'y' © © 😀 ⪢̸",
    );
  });

  it("replaces invalid code points as browsers do", () => {
    expect(decode("&#0;&#xD800;&#x110000;")).toBe("���");
    expect(decode("&#128;")).toBe("€");
  });

  it("decodes legacy references without semicolons only outside strict mode", () => {
    expect(decode("&copy 2024")).toBe("© 2024");
    expect(decode("&copy 2024", true)).toBe("&copy 2024");
  });

  it("leaves unknown references as written and lists them", () => {
    const result = decodeHtmlEntities("&unknown; &amp;", { strict: true }, entities);
    expect(result.ok && result.output).toBe("&unknown; &");
    expect(result.ok && result.note).toContain("&unknown;");
  });

  it("round-trips arbitrary text", () => {
    const text = `<script>alert("x & y")</script> 'quoted' Café 😀 &amp;`;
    for (const nonAscii of ["keep", "named", "numeric"] as const) {
      expect(decode(encode(text, { nonAscii, doubleEncode: true }))).toBe(text);
    }
  });
});

describe("loadEntities", () => {
  it("loads the entity table on demand", async () => {
    const lib = await loadEntities();
    expect(encodeHtmlEntities("é", { nonAscii: "named", doubleEncode: false }, lib)).toMatchObject({ ok: true, output: "&eacute;" });
  });
});
