import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Room for translation file imports (default is 1mb).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
