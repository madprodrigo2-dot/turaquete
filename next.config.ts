import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No remotePatterns — all racket images are self-hosted under /public/raquetes/.
  // If next/image is used for external URLs in the future, add an explicit allowlist here.
  env: {
    BUILD_DATE: new Date().toISOString().slice(0, 10),
    BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? '',
  },
};

export default nextConfig;
