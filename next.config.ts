import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["api.testnet.shelby.xyz", "api.shelbynet.shelby.xyz"],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
