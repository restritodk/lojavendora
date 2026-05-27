import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "60mb",
    },
  },
};

export default nextConfig;
