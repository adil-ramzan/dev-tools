import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// A fixed zone with daylight saving time, so local-time tests are deterministic.
process.env.TZ = "America/New_York";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
