import { readFile } from "node:fs/promises";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { expect, test } from "@playwright/test";
import { alert, copyAndRead, field, removeWebCrypto, watchForLeaks } from "./helpers";

test.describe("Bcrypt Hash & Verify", () => {
  test("hashes a password and verifies it, without leaking it", async ({ page }) => {
    await page.goto("/tools/bcrypt-hash-verify");
    const check = watchForLeaks(page);
    const password = "Sup3r-Secret-Bcrypt!";
    const passwordField = page.getByLabel("Password", { exact: true });
    await expect(passwordField).toHaveAttribute("type", "password");
    await expect(passwordField).toHaveAttribute("autocomplete", "off");
    await passwordField.fill(password);
    await page.getByRole("spinbutton", { name: /Cost factor/ }).fill("4");
    await page.getByRole("button", { name: "Generate hash" }).click();
    await expect(field(page, "Generated hash")).toHaveValue(/^\$2b\$04\$[./A-Za-z0-9]{53}$/);
    const hash = await field(page, "Generated hash").inputValue();
    await expect(page.getByText(/Cost 4 took .* here/)).toBeVisible();
    expect(await copyAndRead(page, "Copy bcrypt hash")).toBe(hash);

    await page.getByLabel("Password to check").fill(password);
    await page.getByPlaceholder("$2b$10$…").fill(hash);
    await expect(page.getByText("Version $2b$, cost 4")).toBeVisible();
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("Match: the password is correct for this hash.")).toBeVisible();
    await page.getByLabel("Password to check").fill(password + "x");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("No match: the password does not produce this hash.")).toBeVisible();
    await check([password]);
  });

  test("explains malformed hashes and long passwords", async ({ page }) => {
    await page.goto("/tools/bcrypt-hash-verify");
    await page.getByPlaceholder("$2b$10$…").fill("5f4dcc3b5aa765d61d8327deb882cf99");
    await expect(page.getByText("A bcrypt hash starts with $2a$, $2b$ or $2y$.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Verify" })).toBeDisabled();
    await page.getByLabel("Password", { exact: true }).fill("é".repeat(40));
    await page.getByRole("spinbutton", { name: /Cost factor/ }).fill("4");
    await page.getByRole("button", { name: "Generate hash" }).click();
    await expect(page.getByText(/80 bytes as UTF-8/)).toBeVisible();
  });

  test("shows and hides the password and clears everything", async ({ page }) => {
    await page.goto("/tools/bcrypt-hash-verify");
    const passwordField = page.getByLabel("Password", { exact: true });
    await passwordField.fill("visible?");
    await page.getByRole("button", { name: "Show password" }).first().click();
    await expect(passwordField).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(passwordField).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Clear" }).first().click();
    await expect(passwordField).toHaveValue("");
  });
});

test.describe("HMAC Generator", () => {
  test("matches RFC 4231 and verifies an expected signature, without leaking the key", async ({ page }) => {
    await page.goto("/tools/hmac-generator");
    const check = watchForLeaks(page);
    await page.getByLabel("Secret key").fill("Jefe");
    await field(page, "Message").fill("what do ya want for nothing?");
    const signature = field(page, "Signature");
    await expect(signature).toHaveValue("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
    await expect(page.getByText(/4 bytes. RFC 2104 recommends at least 32/)).toBeVisible();
    await page.getByText("HMAC-SHA512", { exact: true }).click();
    await expect(signature).toHaveValue(/^164b7a7bfcf819e2/);
    await page.getByText("HMAC-SHA256", { exact: true }).click();
    await page.getByText("Base64", { exact: true }).last().click();
    await expect(signature).toHaveValue("W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM=");
    expect(await copyAndRead(page, "Copy signature")).toBe("W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM=");
    await page.getByLabel(/Compare with an expected signature/).fill("5BDCC146BF60754E6A042426089575C75A003F089D2739839DEC58B964EC3843");
    await expect(page.getByText("Match: the signatures are identical.")).toBeVisible();
    await page.getByLabel(/Compare with an expected signature/).fill("00".repeat(32));
    await expect(page.getByText(/^No match/)).toBeVisible();
    await check(["Jefe"]);
  });

  test("uses hex keys and rejects malformed hex", async ({ page }) => {
    await page.goto("/tools/hmac-generator");
    await page.getByText("Hex", { exact: true }).first().click();
    await page.getByLabel("Secret key").fill("0b".repeat(20));
    await field(page, "Message").fill("Hi There");
    await expect(field(page, "Signature")).toHaveValue("b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7");
    await page.getByLabel("Secret key").fill("0b0");
    await expect(alert(page)).toContainText("3 digits");
    await expect(field(page, "Signature")).toHaveValue("");
  });

  test("explains when Web Crypto is unavailable", async ({ page }) => {
    await removeWebCrypto(page);
    await page.goto("/tools/hmac-generator");
    await page.getByLabel("Secret key").fill("key");
    await expect(alert(page)).toContainText("Web Crypto");
  });
});

test.describe("RSA Key Pair Generator", () => {
  test("generates a key pair that OpenSSL accepts, copies and downloads it, and never sends it", async ({ page }) => {
    await page.goto("/tools/rsa-key-pair-generator");
    const check = watchForLeaks(page);
    await page.getByRole("button", { name: "Generate key pair" }).click();
    const publicPem = field(page, "Public key (SPKI PEM)");
    await expect(publicPem).toHaveValue(/^-----BEGIN PUBLIC KEY-----/, { timeout: 30_000 });
    const privatePemText = await field(page, "Private key (PKCS#8 PEM)").inputValue();
    expect(privatePemText).toMatch(/^-----BEGIN PRIVATE KEY-----\n[\s\S]+-----END PRIVATE KEY-----\n$/);
    expect(createPublicKey(await publicPem.inputValue()).asymmetricKeyDetails?.modulusLength).toBe(2048);
    expect(createPrivateKey(privatePemText).asymmetricKeyType).toBe("rsa");
    await expect(page.getByText(/Public key SHA-256 fingerprint: \S{43}$/)).toBeVisible();
    await expect(page.getByText("The private key is sensitive and unencrypted")).toBeVisible();

    expect(await copyAndRead(page, "Copy private key")).toBe(privatePemText);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download" }).last().click()]);
    expect(download.suggestedFilename()).toBe("private_key.pem");
    expect(await readFile(await download.path(), "utf8")).toBe(privatePemText);

    const body = privatePemText.split("\n")[5];
    await check([body]);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "Private key (PKCS#8 PEM)")).toHaveValue("");
  });

  test("generates 4096-bit keys", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/tools/rsa-key-pair-generator");
    await page.getByText("4096 bits", { exact: true }).click();
    await page.getByRole("button", { name: "Generate key pair" }).click();
    await expect(field(page, "Public key (SPKI PEM)")).toHaveValue(/BEGIN PUBLIC KEY/, { timeout: 60_000 });
    expect(createPublicKey(await field(page, "Public key (SPKI PEM)").inputValue()).asymmetricKeyDetails?.modulusLength).toBe(4096);
  });

  test("explains when Web Crypto is unavailable", async ({ page }) => {
    await removeWebCrypto(page);
    await page.goto("/tools/rsa-key-pair-generator");
    await page.getByRole("button", { name: "Generate key pair" }).click();
    await expect(alert(page)).toContainText("Web Crypto");
  });
});

test.describe("Password Strength Analyzer", () => {
  test("rates weak and strong passwords with feedback, without leaking them", async ({ page }) => {
    await page.goto("/tools/password-strength-analyzer");
    const check = watchForLeaks(page);
    const input = page.getByLabel("Password", { exact: true });
    await expect(input).toHaveAttribute("type", "password");
    // "password" itself appears in this page's URL, so a different common password is used.
    await input.fill("iloveyou");
    await expect(page.locator("[data-strength-score]")).toHaveText("Very weak");
    await expect(alert(page)).toContainText(/common|used password/);
    await expect(page.getByText(/at least 12 characters/)).toBeVisible();

    const strong = "x7#Kp9$mQ2vL!nB4-Zq";
    await input.fill(strong);
    await expect(page.locator("[data-strength-score]")).toHaveText("Very strong");
    await expect(page.getByText("Stolen hashes, fast hash such as SHA-256 (10 billion/second)")).toBeVisible();
    await expect(page.getByText("A score is an estimate, not a guarantee")).toBeVisible();
    await check(["iloveyou", strong]);
  });

  test("penalizes personal information and clears", async ({ page }) => {
    await page.goto("/tools/password-strength-analyzer");
    const input = page.getByLabel("Password", { exact: true });
    await input.fill("grace-hopper-1906");
    const guesses = page.getByText(/guesses$/);
    await expect(guesses).toBeVisible();
    const before = await guesses.textContent();
    await page.getByLabel("Words about you (optional)").fill("Grace Hopper");
    await expect(guesses).not.toHaveText(before!);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(input).toHaveValue("");
    await expect(page.locator("[data-strength-score]")).toHaveCount(0);
  });

  test("handles very long input", async ({ page }) => {
    await page.goto("/tools/password-strength-analyzer");
    await page.getByLabel("Password", { exact: true }).fill("aB3$".repeat(200));
    await expect(page.getByText("Only the first 256 characters were analyzed")).toBeVisible();
  });
});
