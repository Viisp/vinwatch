import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  devIndicators: false,
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/sync-vinted": [
      "./node_modules/playwright-core/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
  },
};

export default nextConfig;
