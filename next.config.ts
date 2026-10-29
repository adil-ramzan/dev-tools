import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A static site: every page is prerendered to out/ and served as Cloudflare static assets.
  output: "export",
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
