import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import { expect, test } from "@playwright/test";
import { alert, copyAndRead, field, removeWebCrypto, watchForLeaks } from "./helpers";

test.describe("Text Encryption & Decryption", () => {
  const plaintext = "Launch code: 7-ALPHA-9 (do not share)";
  const password = "a-long-unique-passphrase-42";

  test("encrypts, decrypts and never leaks the text or password", async ({ page }) => {
    await page.goto("/tools/text-encryption");
    const check = watchForLeaks(page);
    await field(page, "Text to encrypt").fill(plaintext);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await expect(page.getByRole("button", { name: "Encrypt", exact: true })).toBeDisabled();
    await page.getByLabel("Confirm password").fill(password + "x");
    await expect(page.getByText("The passwords do not match.")).toBeVisible();
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Encrypt", exact: true }).click();

    const output = field(page, "Encrypted text");
    await expect(output).toHaveValue(/^v1\.pbkdf2-sha256\.600000\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+$/);
    const payload = await output.inputValue();
    expect(payload).not.toContain("Launch");
    expect(await copyAndRead(page, "Copy encrypted text")).toBe(payload);

    // An independent implementation can decrypt the payload.
    const [v, kdf, iterations, salt, iv, data] = payload.split(".");
    const bytes = Buffer.from(data, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", pbkdf2Sync(password, Buffer.from(salt, "base64url"), Number(iterations), 32, "sha256"), Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(`${v}.${kdf}.${iterations}`));
    decipher.setAuthTag(bytes.subarray(-16));
    expect(Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]).toString()).toBe(plaintext);

    await page.getByRole("button", { name: "Decrypt this" }).click();
    await expect(field(page, "Encrypted text")).toHaveValue(payload);
    await page.getByRole("button", { name: "Decrypt", exact: true }).click();
    await expect(field(page, "Decrypted text")).toHaveValue(plaintext);
    await expect(page.getByText("Decrypted and verified")).toBeVisible();
    await check([plaintext, password]);
  });

  test("gives one generic error for a wrong password or tampered data", async ({ page }) => {
    await page.goto("/tools/text-encryption");
    await field(page, "Text to encrypt").fill("tamper test");
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Encrypt", exact: true }).click();
    await expect(field(page, "Encrypted text")).toHaveValue(/^v1\./);
    const payload = await field(page, "Encrypted text").inputValue();
    await page.getByRole("button", { name: "Decrypt this" }).click();

    await page.getByLabel("Password", { exact: true }).fill("wrong password");
    await page.getByRole("button", { name: "Decrypt", exact: true }).click();
    const generic = "Decryption failed. The password is wrong, or the encrypted text has been changed or corrupted.";
    await expect(alert(page)).toContainText(generic);

    const last = payload.at(-2) === "A" ? "B" : "A";
    await field(page, "Encrypted text").fill(payload.slice(0, -2) + last + payload.at(-1));
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Decrypt", exact: true }).click();
    await expect(alert(page)).toContainText(generic);
    await expect(field(page, "Decrypted text")).toHaveValue("");

    await field(page, "Encrypted text").fill("not a payload");
    await page.getByRole("button", { name: "Decrypt", exact: true }).click();
    await expect(alert(page)).toContainText("not encrypted text from this tool");
  });

  test("explains when Web Crypto is unavailable", async ({ page }) => {
    await removeWebCrypto(page);
    await page.goto("/tools/text-encryption");
    await field(page, "Text to encrypt").fill("x");
    await page.getByLabel("Password", { exact: true }).fill("password");
    await page.getByLabel("Confirm password").fill("password");
    await page.getByRole("button", { name: "Encrypt", exact: true }).click();
    await expect(alert(page)).toContainText("Web Crypto");
  });

  test("clears every field", async ({ page }) => {
    await page.goto("/tools/text-encryption");
    await page.getByRole("button", { name: "Sample" }).click();
    await page.getByLabel("Password", { exact: true }).fill("secret");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "Text to encrypt")).toHaveValue("");
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  });
});

test.describe("TOTP Generator & Validator", () => {
  // RFC 6238 test vector: ASCII "12345678901234567890", SHA-1, 8 digits.
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  test("shows the RFC 6238 code at a fixed time and validates within the window", async ({ page }) => {
    await page.clock.setFixedTime(new Date(1111111111 * 1000));
    await page.goto("/tools/totp-generator-validator");
    const check = watchForLeaks(page);
    await page.getByLabel("Secret (Base32)").fill(secret);
    await page.getByText("8", { exact: true }).click();
    await expect(page.locator("[data-totp-code]")).toHaveText("14050471");
    await expect(page.getByText("Changes in 29 s")).toBeVisible();
    expect(await copyAndRead(page, "Copy code")).toBe("14050471");

    await page.getByLabel("Code", { exact: true }).fill("07081804");
    await page.getByRole("button", { name: "Validate" }).click();
    await expect(page.getByText("Valid: the code matches 1 period ago.")).toBeVisible();
    await page.getByLabel("Allowed clock skew").selectOption("0");
    await page.getByRole("button", { name: "Validate" }).click();
    await expect(page.getByText(/^Invalid: the code does not match/)).toBeVisible();
    await page.getByLabel("Code", { exact: true }).fill("123");
    await page.getByRole("button", { name: "Validate" }).click();
    await expect(page.getByText("Enter the 8-digit code.")).toBeVisible();
    await check([secret, "14050471"]);
  });

  test("uses SHA-256 and SHA-512 test vectors", async ({ page }) => {
    await page.clock.setFixedTime(new Date(59 * 1000));
    await page.goto("/tools/totp-generator-validator");
    await page.getByText("8", { exact: true }).click();
    await page.getByLabel("Algorithm").selectOption("SHA-256");
    await page.getByLabel("Secret (Base32)").fill("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA");
    await expect(page.locator("[data-totp-code]")).toHaveText("46119246");
    await page.getByLabel("Algorithm").selectOption("SHA-512");
    await page.getByLabel("Secret (Base32)").fill("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA");
    await expect(page.locator("[data-totp-code]")).toHaveText("90693936");
  });

  test("imports and builds otpauth URIs and generates secrets", async ({ page }) => {
    await page.goto("/tools/totp-generator-validator");
    await page.getByLabel("Import an otpauth:// URI").fill("otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example");
    await page.getByRole("button", { name: "Import" }).click();
    await expect(page.getByText("Imported Example (alice@google.com).")).toBeVisible();
    await expect(page.getByLabel("Secret (Base32)")).toHaveValue("JBSWY3DPEHPK3PXP");
    await expect(page.locator("[data-totp-code]")).toHaveText(/^\d{6}$/);
    await expect(field(page, "otpauth:// URI")).toHaveValue("otpauth://totp/Example:alice%40google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30");

    await page.getByLabel("Import an otpauth:// URI").fill("otpauth://hotp/x?secret=JBSWY3DPEHPK3PXP");
    await page.getByRole("button", { name: "Import" }).click();
    await expect(page.getByText(/^This is an HOTP/)).toBeVisible();

    await page.getByRole("button", { name: "Generate" }).click();
    await expect(page.getByLabel("Secret (Base32)")).toHaveValue(/^[A-Z2-7]{32}$/);
    await expect(page.getByLabel("Secret (Base32)")).toHaveAttribute("type", "password");
  });

  test("reports invalid secrets", async ({ page }) => {
    await page.goto("/tools/totp-generator-validator");
    await page.getByLabel("Secret (Base32)").fill("JBSWY3DP0000000000");
    await expect(alert(page)).toContainText("not a Base32 character");
    await page.getByLabel("Secret (Base32)").fill("JBSWY3DP");
    await expect(alert(page)).toContainText("80 bits");
  });

  test("explains when Web Crypto is unavailable", async ({ page }) => {
    await removeWebCrypto(page);
    await page.goto("/tools/totp-generator-validator");
    await page.getByLabel("Secret (Base32)").fill(secret);
    await expect(alert(page)).toContainText("Web Crypto");
  });
});

test.describe("Basic Auth Header Generator", () => {
  test("builds the RFC 7617 header and decodes it, without leaking the password", async ({ page }) => {
    await page.goto("/tools/basic-auth-header-generator");
    const check = watchForLeaks(page);
    await page.getByLabel("Username").fill("Aladdin");
    await page.getByLabel("Password", { exact: true }).fill("open sesame");
    await expect(field(page, "Header")).toHaveValue("Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==");
    expect(await copyAndRead(page, "Copy header")).toBe("Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==");
    await expect(field(page, "curl")).toHaveValue("curl -H 'Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==' https://api.example.com/");

    await page.getByLabel("Authorization header or Base64 value").fill("Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==");
    await expect(page.locator('[data-decoded="username"]')).toHaveText("Aladdin");
    await expect(page.locator('[data-decoded="password"]')).toHaveText("open sesame");
    await expect(page.getByText("Base64 is encoding, not encryption")).toBeVisible();
    await check(["open sesame"]);
  });

  test("encodes UTF-8 and validates the username", async ({ page }) => {
    await page.goto("/tools/basic-auth-header-generator");
    await page.getByLabel("Username").fill("test");
    await page.getByLabel("Password", { exact: true }).fill("123£");
    await expect(field(page, "Header")).toHaveValue("Authorization: Basic dGVzdDoxMjPCow==");
    await expect(page.getByText(/non-ASCII characters, encoded as UTF-8/)).toBeVisible();
    await page.getByLabel("Username").fill("bad:user");
    await expect(page.getByText(/^The username cannot contain a colon/)).toBeVisible();
    await expect(page.getByLabel("Username")).toHaveAttribute("aria-invalid", "true");
    await expect(field(page, "Header")).toHaveValue("");
  });

  test("sample, clear and decode errors", async ({ page }) => {
    await page.goto("/tools/basic-auth-header-generator");
    await page.getByRole("button", { name: "Sample" }).click();
    await expect(field(page, "Header")).toHaveValue(/QWxhZGRpbjpvcGVuIHNlc2FtZQ==/);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByLabel("Username")).toHaveValue("");
    await page.getByLabel("Authorization header or Base64 value").fill("Bearer abc.def");
    await expect(page.getByText(/Bearer token/)).toBeVisible();
  });
});
