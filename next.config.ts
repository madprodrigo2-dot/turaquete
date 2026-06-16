import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _pkg  = require('./package.json') as { version: string }
const _sha  = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? ''
const _iso  = new Date().toISOString()                         // UTC, e.g. "2026-06-16T14:30:00Z"
const _dd   = _iso.slice(8, 10)
const _mm   = _iso.slice(5, 7)
const _hhmm = _iso.slice(11, 16)
// "v1.0.0 · 16/06 14:30 UTC"  — visible in client components (DebugPanel)
const _buildLabel = `v${_pkg.version} · ${_dd}/${_mm} ${_hhmm} UTC`

const nextConfig: NextConfig = {
  // No remotePatterns — all racket images are self-hosted under /public/raquetes/.
  // If next/image is used for external URLs in the future, add an explicit allowlist here.
  env: {
    BUILD_DATE:              _iso.slice(0, 10),
    BUILD_SHA:               _sha,
    NEXT_PUBLIC_BUILD_LABEL: _buildLabel,
  },
};

export default nextConfig;
