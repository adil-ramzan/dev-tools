import { describe, expect, it } from "vitest";
import { defaultObfuscateOptions, obfuscate, type ObfuscateOptions } from "@/lib/tools/obfuscate";

function mask(input: string, options: Partial<ObfuscateOptions> = {}) {
  const result = obfuscate(input, { ...defaultObfuscateOptions, ...options });
  if (!result.ok) throw new Error(result.error);
  return result;
}
const out = (input: string, options: Partial<ObfuscateOptions> = {}) => mask(input, options).output;

describe("obfuscate", () => {
  it("keeps the first and last characters and masks the rest", () => {
    expect(out("sk_live_abcdef123")).toBe("sk*************23");
    expect(out("secret", { keepStart: 1, keepEnd: 0 })).toBe("s*****");
    expect(out("secret", { keepStart: 0, keepEnd: 0 })).toBe("******");
  });

  it("masks short values entirely instead of revealing them", () => {
    const result = mask("abcd\nabcde", { keepStart: 2, keepEnd: 2 });
    expect(result.output).toBe("****\nab*de");
    expect(result.fullyMasked).toBe(1);
    expect(out("ab", { keepStart: 1, keepEnd: 0 })).toBe("a*");
    expect(out("a", { keepStart: 1, keepEnd: 0 })).toBe("*");
  });

  it("masks each line separately, keeping blank lines and line endings", () => {
    const result = mask("alpha123\n\r\nbravo456\n", { keepStart: 1, keepEnd: 1 });
    expect(result.output).toBe("a******3\n\r\nb******6\n");
    expect(result.values).toBe(2);
  });

  it("can treat the whole input as one value", () => {
    expect(out("abc\ndef", { perLine: false, keepStart: 1, keepEnd: 1 })).toBe("a*****f");
  });

  it("masks emoji and accented letters as single characters", () => {
    expect(out("é👍🏽abc👨‍👩‍👧z", { keepStart: 1, keepEnd: 1 })).toBe("é*****z");
    expect(out("cafés", { keepStart: 0, keepEnd: 0 })).toBe("*****");
  });

  it("keeps punctuation and spaces visible when asked", () => {
    expect(out("4111-1111-1111-1234", { keepStart: 0, keepEnd: 4, keepPunctuation: true })).toBe("****-****-****-1234");
    expect(out("John Smith", { keepStart: 1, keepEnd: 1, keepPunctuation: true })).toBe("J*** ****h");
  });

  it("keeps an email domain when asked", () => {
    expect(out("ada.lovelace@example.com", { keepStart: 1, keepEnd: 1, keepEmailDomain: true })).toBe("a**********e@example.com");
    expect(out("not-an-email", { keepStart: 1, keepEnd: 1, keepEmailDomain: true })).toBe("n**********l");
  });

  it("hides the length with a fixed mask", () => {
    expect(out("averyveryverylongsecret", { keepStart: 2, keepEnd: 2, fixedLength: 4 })).toBe("av****et");
    expect(out("ab", { keepStart: 2, keepEnd: 2, fixedLength: 4 })).toBe("****");
  });

  it("uses a custom mask character", () => {
    expect(out("password", { mask: "•" })).toBe("pa••••rd");
    expect(out("password", { mask: "🔒", keepStart: 0, keepEnd: 0 })).toBe("🔒".repeat(8));
  });

  it("preserves surrounding whitespace", () => {
    expect(out("  token123  ", { keepStart: 1, keepEnd: 1 })).toBe("  t******3  ");
  });

  it("never includes hidden characters in the output", () => {
    const secret = "QX7mZ9pL2vR8";
    const result = out(secret, { keepStart: 2, keepEnd: 2 });
    for (const c of secret.slice(2, -2)) expect(result).not.toContain(c);
  });

  it("validates options", () => {
    const check = (o: Partial<ObfuscateOptions>) => obfuscate("abc", { ...defaultObfuscateOptions, ...o }).ok;
    expect(check({ keepStart: -1 })).toBe(false);
    expect(check({ keepEnd: 1.5 })).toBe(false);
    expect(check({ keepStart: 65 })).toBe(false);
    expect(check({ mask: "" })).toBe(false);
    expect(check({ mask: "**" })).toBe(false);
    expect(check({ mask: " " })).toBe(false);
    expect(check({ fixedLength: 100 })).toBe(false);
  });

  it("returns empty input unchanged", () => {
    expect(mask("").output).toBe("");
    expect(mask("").values).toBe(0);
  });
});
