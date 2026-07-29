import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  devIndicators: false,
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
};

export default nextConfig;
