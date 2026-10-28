import { expect, test, type Page } from "@playwright/test";
import { accessibilityViolations, copyAndRead, field, hasHorizontalOverflow, watchForLeaks } from "./helpers";

const PAGES = ["chmod-calculator", "ipv4-subnet-calculator", "ipv4-address-converter", "ipv4-range-expander"];

async function markPage(page: Page) {
  await page.evaluate(() => ((window as unknown as { __noReload: string }).__noReload = "still here"));
}
async function expectSamePage(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __noReload?: string }).__noReload)).toBe("still here");
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
}

test.describe("Phase 10 batch 1: accessibility and layout", () => {
  for (const slug of PAGES) {
    test(slug, async ({ page }) => {
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await page.goto(`/tools/${slug}`);
        expect(await accessibilityViolations(page), colorScheme).toEqual([]);
      }
      await page.setViewportSize({ width: 360, height: 800 });
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

test.describe("Chmod Calculator", () => {
  test("converts both ways, syncs the checkboxes and resets", async ({ page }) => {
    await page.goto("/tools/chmod-calculator");
    await markPage(page);
    const input = page.getByLabel("Octal mode or symbolic permissions");
    await expect(page.locator('[data-result="symbolic"]')).toHaveText("rw-r--r--");
    await input.fill("755");
    await expect(page.locator('[data-result="symbolic"]')).toHaveText("rwxr-xr-x");
    await expect(page.locator('[data-result="command-symbolic"]')).toHaveText("chmod u=rwx,g=rx,o=rx file");
    await expect(page.getByRole("checkbox", { name: "Others (o) execute" })).toBeChecked();
    await page.getByRole("checkbox", { name: "Others (o) execute" }).uncheck();
    await expect(input).toHaveValue("754");
    await input.fill("drwxrws---");
    await expect(page.locator('[data-result="octal"]')).toHaveText("2770");
    await expect(page.getByRole("radio", { name: "Directory" })).toBeChecked();
    await expect(page.locator('[data-explain="group"]')).toHaveText("Members of the group can list the contents, create, rename and delete entries and enter and access files inside.");
    await page.getByRole("button", { name: /^777:/ }).count().then((n) => expect(n).toBe(0));
    await input.fill("777");
    await expect(page.getByText(/World-writable files and directories/)).toBeVisible();
    await page.getByLabel("File name for the commands").fill("my script.sh");
    expect(await copyAndRead(page, "Copy chmod (octal)")).toBe("chmod 777 'my script.sh'");
    await input.fill("789");
    await expect(page.getByText("Octal modes use only the digits 0 to 7.")).toBeVisible();
    await expect(page.locator('[data-result="octal"]')).toHaveText("777");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(input).toHaveValue("644");
    await expect(page.locator('[data-result="command-octal"]')).toHaveText("chmod 644 file");
    await page.getByRole("button", { name: /^1777:/ }).click();
    await expect(page.locator('[data-result="symbolic"]')).toHaveText("rwxrwxrwt");
    await expectSamePage(page);
  });
});

test.describe("IPv4 Subnet Calculator", () => {
  test("calculates subnets, handles /31 and /32, and clears", async ({ page }) => {
    await page.goto("/tools/ipv4-subnet-calculator");
    await markPage(page);
    const check = watchForLeaks(page);
    const address = page.getByLabel("IPv4 address");
    await address.fill("192.168.10.77/26");
    await expect(page.locator('[data-subnet="network address"]')).toHaveText("192.168.10.64/26");
    await expect(page.locator('[data-subnet="broadcast address"]')).toHaveText("192.168.10.127");
    await expect(page.locator('[data-subnet="first usable address"]')).toHaveText("192.168.10.65");
    await expect(page.locator('[data-subnet="usable hosts"]')).toHaveText("62");
    await expect(page.locator('[data-subnet="type"]')).toContainText("Private");
    expect(await copyAndRead(page, "Copy subnet mask")).toBe("255.255.255.192");

    await address.fill("10.0.0.5");
    await page.getByLabel("Prefix").selectOption("31");
    await expect(page.getByText("/31: a point-to-point link")).toBeVisible();
    await expect(page.locator('[data-subnet="usable hosts"]')).toHaveText("2");
    await page.getByLabel("Prefix").selectOption("32");
    await expect(page.locator('[data-subnet="total addresses"]')).toHaveText("1");
    await address.fill("10.0.0.5/255.0.255.0");
    await expect(page.getByText(/contiguous/)).toBeVisible();
    await address.fill("300.1.1.1/24");
    await expect(page.getByText(/larger than 255/)).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(address).toHaveValue("");
    await expect(page.locator("[data-subnet]")).toHaveCount(0);
    await check(["192.168.10.77"]);
    await expectSamePage(page);
  });
});

test.describe("IPv4 Address Converter", () => {
  test("converts every form and validates boundaries", async ({ page }) => {
    await page.goto("/tools/ipv4-address-converter");
    await markPage(page);
    const input = page.getByLabel("IPv4 address in any form");
    await input.fill("192.168.1.1");
    await expect(page.locator('[data-format="integer"]')).toHaveText("3232235777");
    await expect(page.locator('[data-format="hex"]')).toHaveText("0xC0A80101");
    await expect(page.locator('[data-format="binary"]')).toHaveText("11000000.10101000.00000001.00000001");
    await input.fill("4294967295");
    await expect(page.locator('[data-format="dotted"]')).toHaveText("255.255.255.255");
    await input.fill("4294967296");
    await expect(page.getByText(/larger than 4,294,967,295/)).toBeVisible();
    await input.fill("10101010");
    await expect(page.locator('[data-format="dotted"]')).toHaveText("0.154.33.18");
    await page.getByLabel("Read as").selectOption("binary");
    await expect(page.getByText(/32 bits; this has 8/)).toBeVisible();
    expect(await page.locator("[data-format]").count()).toBe(0);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(input).toHaveValue("");
    await expect(page.getByLabel("Read as")).toHaveValue("auto");
    await page.getByRole("button", { name: "Sample" }).click();
    await expect(page.locator('[data-format="integer"]')).toHaveText("3232235777");
    await expectSamePage(page);
  });
});

test.describe("IPv4 Range Expander", () => {
  test("estimates, expands, truncates large ranges and repeats", async ({ page }) => {
    await page.goto("/tools/ipv4-range-expander");
    await markPage(page);
    const input = page.getByLabel("CIDR block or address range");
    const output = field(page, "Addresses");
    await input.fill("192.168.1.0/30");
    await expect(page.locator("[data-estimate]")).toHaveText("192.168.1.0 – 192.168.1.3: 4 addresses.");
    await page.getByRole("button", { name: "Expand" }).click();
    await expect(field(page, "4 addresses")).toHaveValue("192.168.1.0\n192.168.1.1\n192.168.1.2\n192.168.1.3");

    await page.getByRole("checkbox", { name: /Skip network and broadcast/ }).check();
    await input.press("ControlOrMeta+Enter");
    await expect(field(page, "2 addresses")).toHaveValue("192.168.1.1\n192.168.1.2");

    await input.fill("10.0.0.0/8");
    await expect(page.locator("[data-estimate]")).toContainText("16,777,214 addresses. Only the first 1,024 will be listed.");
    const started = Date.now();
    await page.getByRole("button", { name: "Expand" }).click();
    await expect(page.getByText("Showing 1,024 of 16,777,214 addresses")).toBeVisible();
    expect(Date.now() - started).toBeLessThan(3000);
    expect((await field(page, "1,024 addresses").inputValue()).split("\n")).toHaveLength(1024);

    await input.fill("10.0.0.250 - 10.0.1.2");
    await page.getByLabel("Separate with").selectOption("comma");
    await page.getByRole("button", { name: "Expand" }).click();
    await expect(field(page, "9 addresses")).toHaveValue("10.0.0.250, 10.0.0.251, 10.0.0.252, 10.0.0.253, 10.0.0.254, 10.0.0.255, 10.0.1.0, 10.0.1.1, 10.0.1.2");

    await input.fill("10.0.0.9 - 10.0.0.1");
    await expect(page.getByText(/comes before the start address/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Expand" })).toBeDisabled();
    await page.getByLabel("Output limit").fill("0");
    await expect(page.getByText(/output limit must be a whole number/)).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(input).toHaveValue("");
    await expect(output).toHaveValue("");
    await expectSamePage(page);
  });
});
