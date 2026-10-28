import { expect, test } from "@playwright/test";
import { alert, copyAndRead, field } from "./helpers";

test.describe("Hash Generator", () => {
  test("hashes text as you type and copies a digest", async ({ page }) => {
    await page.goto("/tools/hash-generator");
    await field(page, "Text to hash").fill("abc");
    await expect(page.locator('output[data-algorithm="sha256"]')).toHaveText("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    await expect(page.locator('output[data-algorithm="md5"]')).toHaveText("900150983cd24fb0d6963f7d28e17f72");
    await expect(page.getByText("Not for security")).toHaveCount(2);
    expect(await copyAndRead(page, "Copy SHA-256 hash")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  test("loads library algorithms on demand and switches output format", async ({ page }) => {
    await page.goto("/tools/hash-generator");
    await field(page, "Text to hash").fill("abc");
    await page.getByRole("checkbox", { name: "SHA3-256", exact: true }).check();
    await page.getByRole("checkbox", { name: "RIPEMD-160", exact: true }).check();
    await expect(page.locator('output[data-algorithm="sha3-256"]')).toHaveText("3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532");
    await expect(page.locator('output[data-algorithm="ripemd160"]')).toHaveText("8eb208f7e05d987a9b044a8e98c6b087f15a0bfc");
    await page.getByText("HEX", { exact: true }).click();
    await expect(page.locator('output[data-algorithm="md5"]')).toHaveText("900150983CD24FB0D6963F7D28E17F72");
    await page.getByText("Base64", { exact: true }).click();
    await expect(page.locator('output[data-algorithm="md5"]')).toHaveText("kAFQmDzST7DWlj99KOF/cg==");
    await page.getByRole("checkbox", { name: "MD5", exact: true }).uncheck();
    await expect(page.locator('output[data-algorithm="md5"]')).toHaveCount(0);
  });

  test("sample and clear", async ({ page }) => {
    await page.goto("/tools/hash-generator");
    await page.getByRole("button", { name: "Sample" }).click();
    await expect(field(page, "Text to hash")).toHaveValue(/quick brown fox/);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "Text to hash")).toHaveValue("");
    await expect(page.locator('output[data-algorithm="md5"]')).toHaveText("d41d8cd98f00b204e9800998ecf8427e");
  });
});

test.describe("Date & Time Format Converter", () => {
  test("converts an ISO date to other formats", async ({ page }) => {
    await page.goto("/tools/date-time-format-converter");
    await field(page, "Date and time").fill("2024-03-15T14:30:00+02:00");
    await expect(page.locator('[data-output="iso-utc"]')).toHaveText("2024-03-15T12:30:00.000Z");
    await expect(page.locator('[data-output="unix-s"]')).toHaveText("1710505800");
    await expect(page.locator('[data-output="http"]')).toHaveText("Fri, 15 Mar 2024 12:30:00 GMT");
    await expect(page.getByText("Time zone from the input: +02:00.")).toBeVisible();
    expect(await copyAndRead(page, "Copy Unix time (seconds)")).toBe("1710505800");
  });

  test("refuses ambiguous numeric dates until the order is chosen", async ({ page }) => {
    await page.goto("/tools/date-time-format-converter");
    await field(page, "Date and time").fill("03/04/2024");
    await expect(alert(page)).toContainText("ambiguous");
    await expect(field(page, "Date and time")).toHaveAttribute("aria-invalid", "true");
    await page.getByLabel("Input format").selectOption("dmy");
    await expect(page.locator('[data-output="iso-utc"]')).toHaveText("2024-04-03T00:00:00.000Z");
    await expect(page.getByText("read as UTC")).toBeVisible();
  });

  test("now, sample and clear", async ({ page }) => {
    await page.goto("/tools/date-time-format-converter");
    await page.getByRole("button", { name: "Now" }).click();
    await expect(page.locator('[data-output="relative"]')).toHaveText(/now|second/);
    await page.getByRole("button", { name: "Sample" }).click();
    await expect(page.locator('[data-output="iso-utc"]')).toHaveText("2024-03-15T14:30:00.000Z");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator('[data-output="iso-utc"]')).toHaveCount(0);
  });
});

test.describe("Integer Base Converter", () => {
  test("converts large decimal integers exactly", async ({ page }) => {
    await page.goto("/tools/integer-base-converter");
    await field(page, "Decimal integer").fill("9007199254740993");
    await expect(page.locator('[data-base="16"]')).toHaveText("20000000000001");
    await expect(page.locator('[data-base="2"]')).toHaveText("1" + "0".repeat(52) + "1");
    expect(await copyAndRead(page, "Copy hexadecimal value")).toBe("20000000000001");
  });

  test("validates digits against the input base", async ({ page }) => {
    await page.goto("/tools/integer-base-converter");
    await page.getByText("Binary (2)").click();
    await field(page, "Binary integer").fill("10201");
    await expect(page.getByText('Invalid binary digit "2" at position 3')).toBeVisible();
    await field(page, "Binary integer").fill("-0b1111_1111");
    await expect(page.locator('[data-base="10"]')).toHaveText("-255");
  });

  test("shows prefixes, grouping and two's complement", async ({ page }) => {
    await page.goto("/tools/integer-base-converter");
    await field(page, "Decimal integer").fill("-1");
    await page.getByRole("checkbox", { name: "Prefixes (0b, 0o, 0x)", exact: true }).check();
    await expect(page.locator('[data-base="16"]')).toHaveText("-0x1");
    await page.getByLabel("Two's complement").selectOption("16");
    await expect(page.locator('[data-twos="hex"]')).toHaveText("FFFF");
    await field(page, "Decimal integer").fill("70000");
    await expect(page.getByText("does not fit in a signed 16-bit integer")).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator('[data-base="16"]')).toHaveText("—");
  });
});

test.describe("Base64 File Converter", () => {
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0x10, 0x80]);

  test("encodes a binary file exactly", async ({ page }) => {
    await page.goto("/tools/base64-file-converter");
    await page.getByLabel("File to encode").setInputFiles({ name: "image.png", mimeType: "image/png", buffer: bytes });
    await expect(field(page, "Base64 output")).toHaveValue(bytes.toString("base64"));
    await expect(page.getByText("image.png · image/png · 12 bytes")).toBeVisible();
    await page.getByRole("checkbox", { name: "Data URI (data:…;base64,)", exact: true }).check();
    await expect(field(page, "Base64 output")).toHaveValue(`data:image/png;base64,${bytes.toString("base64")}`);
    expect(await copyAndRead(page, "Copy Base64 output")).toBe(`data:image/png;base64,${bytes.toString("base64")}`);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "Base64 output")).toHaveValue("");
  });

  test("rejects files over the size limit", async ({ page }) => {
    await page.goto("/tools/base64-file-converter");
    await page.getByLabel("File to encode").setInputFiles({ name: "big.bin", mimeType: "application/octet-stream", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    await expect(alert(page)).toContainText("The limit is 10 MB");
  });

  test("decodes Base64 into a downloadable file with identical bytes", async ({ page }) => {
    await page.goto("/tools/base64-file-converter");
    await page.getByText("Base64 → File").click();
    await field(page, "Base64 or data URI").fill(bytes.toString("base64"));
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(page.getByText("PNG image")).toBeVisible();
    await expect(field(page, "File name")).toHaveValue("decoded.png");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download file" }).click()]);
    expect(download.suggestedFilename()).toBe("decoded.png");
    const path = await download.path();
    const { readFile } = await import("node:fs/promises");
    expect((await readFile(path)).equals(bytes)).toBe(true);
  });

  test("reports invalid Base64 and supports the sample", async ({ page }) => {
    await page.goto("/tools/base64-file-converter");
    await page.getByText("Base64 → File").click();
    await field(page, "Base64 or data URI").fill("abc$def");
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(alert(page)).toContainText('Invalid character "$"');
    await page.getByRole("button", { name: "Sample" }).click();
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(page.getByText("Decoded 70 bytes.")).toBeVisible();
  });
});

test.describe("HTML Entity Encoder & Decoder", () => {
  test("encodes without double encoding and decodes back", async ({ page }) => {
    await page.goto("/tools/html-entity-encoder-decoder");
    await field(page, "Input").fill(`<a title="x">Tom & Jerry's &amp;</a>`);
    await page.getByRole("button", { name: "Encode" }).click();
    await expect(field(page, "Output")).toHaveValue("&lt;a title=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s &amp;&lt;/a&gt;");
    await expect(page.getByText("left unchanged to avoid double encoding")).toBeVisible();
    await page.getByRole("button", { name: "Use as input" }).click();
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(field(page, "Output")).toHaveValue(`<a title="x">Tom & Jerry's &</a>`);
  });

  test("encodes non-ASCII as named references and double-encodes on request", async ({ page }) => {
    await page.goto("/tools/html-entity-encoder-decoder");
    await page.getByLabel("Non-ASCII characters").selectOption("named");
    await page.getByRole("checkbox", { name: "Encode existing entities again", exact: true }).check();
    await field(page, "Input").fill("café &amp;");
    await page.getByRole("button", { name: "Encode" }).click();
    await expect(field(page, "Output")).toHaveValue("caf&eacute; &amp;amp;");
    expect(await copyAndRead(page, "Copy output")).toBe("caf&eacute; &amp;amp;");
  });

  test("decodes named and numeric references and shows the sanitizer warning", async ({ page }) => {
    await page.goto("/tools/html-entity-encoder-decoder");
    await expect(page.getByText("Encoding is not sanitizing")).toBeVisible();
    await field(page, "Input").fill("&copy; &#x1F600; &unknown;");
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(field(page, "Output")).toHaveValue("© 😀 &unknown;");
    await expect(page.getByText("Not recognized as HTML references")).toBeVisible();
  });
});

test.describe("Text to Binary Converter", () => {
  test("encodes UTF-8 text and shows the byte breakdown", async ({ page }) => {
    await page.goto("/tools/text-to-binary-converter");
    await field(page, "Input").fill("Hé");
    await page.getByRole("button", { name: "Encode" }).click();
    await expect(field(page, "Output")).toHaveValue("01001000 11000011 10101001");
    await expect(page.getByRole("cell", { name: "U+00E9" })).toBeVisible();
    await page.getByText("None", { exact: true }).click();
    await page.getByRole("button", { name: "Encode" }).click();
    await expect(field(page, "Output")).toHaveValue("010010001100001110101001");
  });

  test("decodes binary and rejects malformed bytes", async ({ page }) => {
    await page.goto("/tools/text-to-binary-converter");
    await field(page, "Input").fill("01001000 01101001");
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(field(page, "Output")).toHaveValue("Hi");
    await field(page, "Input").fill("01001000 1101001");
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(alert(page)).toContainText("Byte 2");
    await field(page, "Input").fill("11000011");
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(alert(page)).toContainText("invalid or incomplete UTF-8");
  });

  test("sample round trip", async ({ page }) => {
    await page.goto("/tools/text-to-binary-converter");
    await page.getByRole("button", { name: "Sample" }).click();
    await page.getByRole("button", { name: "Encode" }).click();
    await page.getByRole("button", { name: "Use as input" }).click();
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(field(page, "Output")).toHaveValue("Hi 👋 é");
  });
});
