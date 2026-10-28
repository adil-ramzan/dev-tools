import { defineConfig, devices } from "@playwright/test";

const port = 3107;

/**
 * Browser tests run against a production build (`npm run build` first) in
 * the locally installed Chrome, so no browser download is needed.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome", permissions: ["clipboard-read", "clipboard-write"] },
    },
  ],
  webServer: {
    command: `npx next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
