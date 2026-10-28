import { expect, test, type Page } from "@playwright/test";
import { accessibilityViolations, alert, copyAndRead, hasHorizontalOverflow, watchForLeaks } from "./helpers";

const PAGES = ["mac-address-lookup", "ipv6-ula-generator", "device-information", "random-port-generator"];

async function markPage(page: Page) {
  await page.evaluate(() => ((window as unknown as { __noReload: string }).__noReload = "still here"));
}
async function expectSamePage(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __noReload?: string }).__noReload)).toBe("still here");
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
}

/** Makes the secure random number generator fail from now on. */
async function breakRandom(page: Page) {
  await page.evaluate(() => {
    crypto.getRandomValues = () => {
      throw new Error("generator unavailable");
    };
  });
}

test.describe("Phase 10 batch 2: accessibility and layout", () => {
  for (const slug of PAGES) {
    test(slug, async ({ page }) => {
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await page.goto(`/tools/${slug}`);
        if (slug === "mac-address-lookup") {
          await page.getByRole("button", { name: "Sample" }).click();
          await expect(page.locator("[data-mac-row]").first()).toBeVisible();
        }
        await expect(page.locator("main")).toBeVisible();
        expect(await accessibilityViolations(page), colorScheme).toEqual([]);
      }
      await page.setViewportSize({ width: 360, height: 800 });
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

test.describe("MAC Address Vendor Lookup", () => {
  test("finds vendors offline, explains missing ones and clears", async ({ page }) => {
    await page.goto("/tools/mac-address-lookup");
    await markPage(page);
    const check = watchForLeaks(page);
    const input = page.getByLabel("MAC addresses (one per line)");
    await expect(page.getByText(/Vendor data: IEEE Registration Authority/)).toBeVisible();

    await input.fill("b8-27-eb-aa-bb-cc");
    await expect(page.locator("[data-vendor]")).toHaveText("Raspberry Pi Foundation");
    await expect(page.locator('[data-mac-format="dot"]')).toHaveText("b827.ebaa.bbcc");
    expect(await copyAndRead(page, "Copy address with colons")).toBe("B8:27:EB:AA:BB:CC");
    await page.getByLabel("Show addresses with").selectOption("hyphen");
    await page.getByLabel("Lowercase").check();
    await expect(page.locator("[data-mac-address]")).toHaveText("b8-27-eb-aa-bb-cc");

    await input.fill("DA:A1:19:00:00:01\n00:00:5E:00:01:01\nnope\n0C:00:00:00:00:01");
    const rows = page.locator("[data-mac-row]");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText("No registered vendor");
    await expect(rows.nth(0)).toContainText("Locally administered");
    await expect(rows.nth(1)).toContainText("ICANN, IANA Department");
    await expect(rows.nth(1)).toContainText("IANA virtual router address");
    await expect(rows.nth(3)).toContainText("not in the IEEE registry");
    await expect(rows.nth(2)).toContainText('"n" is not a hexadecimal digit');
    await expect(page.getByRole("status").filter({ hasText: "1 invalid" })).toBeVisible();
    expect(await copyAndRead(page, "Copy results")).toContain("da-a1-19-00-00-01\tLocally administered");

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(input).toHaveValue("");
    await expect(rows).toHaveCount(0);
    await page.getByRole("button", { name: "Sample" }).click();
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(0)).toContainText("Cisco Systems");
    await expectSamePage(page);
    await check(["DA:A1:19:00:00:01", "daa119000001"]);
  });
});

test.describe("IPv6 ULA Generator", () => {
  test("generates RFC 4193 prefixes, lists subnets and regenerates", async ({ page }) => {
    await page.goto("/tools/ipv6-ula-generator");
    await markPage(page);
    const check = watchForLeaks(page);
    const prefix = page.locator('[data-ula="prefix"]');
    await expect(prefix).toHaveText(/^fd[0-9a-f]{2}:[0-9a-f:]+\/48$/);
    const first = (await prefix.textContent())!;
    const globalId = (await page.locator('[data-ula="global-id"]').textContent())!;
    expect(globalId).toMatch(/^[0-9a-f]{10}$/);
    expect(first.replace(/:/g, "")).toContain(`fd${globalId.slice(0, 2)}`);
    expect(await copyAndRead(page, "Copy ula prefix")).toBe(first);

    const subnets = page.getByLabel(/subnets \(\/64\)/);
    await expect(subnets).toHaveValue(/\/64\n.*\/64\n.*\/64\n.*\/64$/);
    await page.getByLabel("Subnets to list").fill("2");
    await page.getByLabel("First subnet ID (hex)").fill("ff");
    await expect(subnets).toHaveValue(/:ff::\/64\n.*:100::\/64$/);
    await expect(prefix).toHaveText(first);
    await page.getByLabel("First subnet ID (hex)").fill("12345");
    await expect(page.getByText("The first subnet ID is 1 to 4 hexadecimal digits")).toBeVisible();
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByLabel("Subnets to list")).toHaveValue("4");
    await expect(prefix).toHaveText(first);

    const seen = new Set([first]);
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Generate new prefix" }).click();
      await expect(prefix).not.toHaveText([...seen].pop()!);
      seen.add((await prefix.textContent())!);
    }
    expect(seen.size).toBe(4);

    await breakRandom(page);
    await page.getByRole("button", { name: "Generate new prefix" }).click();
    await expect(alert(page)).toContainText("generator unavailable");
    await expectSamePage(page);
    await check([]);
  });
});

test.describe("Device Information", () => {
  test("reports values with labels, updates and refreshes without sending anything", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto("/tools/device-information");
    await markPage(page);
    const check = watchForLeaks(page);
    const viewport = page.locator('[data-info="Viewport (browser window content)"]');
    await expect(viewport).toHaveText("1100 × 800 CSS pixels");
    await expect(page.locator('[data-info="Time zone"]')).not.toHaveText("");
    await expect(page.locator('[data-info="Web Crypto (secure random numbers, hashing)"]')).toHaveText("Available");
    await expect(page.locator('[data-kind="estimate"]').first()).toHaveText("Estimate");
    await expect(page.locator('[data-kind="detected"]').first()).toHaveText("Detected");

    await page.setViewportSize({ width: 900, height: 700 });
    await expect(viewport).toHaveText("900 × 700 CSS pixels");
    await page.context().setOffline(true);
    await expect(page.locator('[data-info="Online"]')).toHaveText("No");
    await page.context().setOffline(false);
    await expect(page.locator('[data-info="Online"]')).toHaveText("Yes");
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Read at/ })).toBeVisible();

    const report = await copyAndRead(page, "Copy report");
    expect(report).toContain("## Display");
    expect(report).toContain("Viewport (browser window content): 900 × 700 CSS pixels (reported)");
    expect(report.toLowerCase()).not.toMatch(/serial|imei|mac address/);
    await expectSamePage(page);
    await check([]);
  });
});

test.describe("Random Port Number Generator", () => {
  test("draws allowed ports, validates settings, resets and regenerates", async ({ page }) => {
    await page.goto("/tools/random-port-generator");
    await markPage(page);
    const check = watchForLeaks(page);
    const output = page.getByLabel(/^\d+ ports?$|^Ports$/);
    await expect(output).toHaveValue(/^(\d+\n){4}\d+$/);
    const ports = (await output.inputValue()).split("\n").map(Number);
    expect(new Set(ports).size).toBe(5);
    for (const p of ports) expect(p >= 1024 && p <= 49151 && ![3000, 3306, 5432, 8080].includes(p)).toBe(true);

    await page.getByLabel("How many").fill("3");
    await page.getByLabel("Lowest port").fill("8000");
    await page.getByLabel("Highest port").fill("8010");
    await page.getByLabel("Also exclude (ports or ranges)").fill("8001-8008");
    await expect(page.locator("[data-port-plan]")).toContainText("Only 2 ports are allowed, so 3 different ports cannot be drawn");
    await expect(page.getByRole("button", { name: "Generate again" })).toBeDisabled();
    await page.getByLabel("No repeats").uncheck();
    await expect(page.locator("[data-port-plan]")).toHaveText("2 ports are allowed. Each is equally likely.");
    await page.getByLabel("No repeats").check();
    await expect(page.locator("[data-port-plan]")).toContainText("Only 2 ports are allowed");
    await expect(page.getByRole("button", { name: "Generate again" })).toBeDisabled();
    await page.getByLabel("How many").fill("2");
    await page.getByRole("button", { name: "Generate again" }).click();
    await expect(output).toHaveValue(/^80(09|10)\n80(09|10)$/);
    expect((await copyAndRead(page, "Copy all ports")).split("\n").sort()).toEqual(["8009", "8010"]);

    await page.getByLabel("Also exclude (ports or ranges)").fill("80x");
    await expect(page.locator("[data-port-plan]")).toContainText('"80x" is not a port or range');
    await page.getByLabel("Highest port").fill("7000");
    await expect(page.locator("[data-port-plan]")).toContainText("greater than the highest port");

    await page.getByRole("button", { name: "Reset settings" }).click();
    await expect(page.getByLabel("Lowest port")).toHaveValue("1024");
    await expect(page.getByLabel("Also exclude (ports or ranges)")).toHaveValue("");
    await page.getByRole("button", { name: "Dynamic 49152–65535" }).click();
    await page.getByLabel("How many").fill("20");
    await page.getByLabel("How many").press("Control+Enter");
    const dynamic = (await output.inputValue()).split("\n").map(Number);
    expect(dynamic).toHaveLength(20);
    for (const p of dynamic) expect(p).toBeGreaterThanOrEqual(49152);

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(output).toHaveValue("");
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(output).not.toHaveValue("");
    await expect(page.getByText("A random port is not guaranteed to be free.")).toBeVisible();

    await breakRandom(page);
    await page.getByRole("button", { name: "Generate again" }).click();
    await expect(alert(page)).toContainText("generator unavailable");
    await expectSamePage(page);
    await check([]);
  });
});
