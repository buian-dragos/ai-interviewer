import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    if (
      !backendUrl ||
      backendUrl.includes("localhost") ||
      backendUrl.includes("127.0.0.1")
    ) {
      return [];
    }

    const base = backendUrl.replace(/\/$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${base}/:path*`,
      },
    ];
  },
};

export default nextConfig;
