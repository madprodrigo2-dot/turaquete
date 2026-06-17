import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const _pkg = require('./package.json') as { version: string }
const _sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? ''

// Horário de Brasília: BRT = UTC-3 (sem horário de verão desde 2019)
const _brt  = new Date(Date.now() - 3 * 60 * 60 * 1000)
const _dd   = String(_brt.getUTCDate()).padStart(2, '0')
const _mm   = String(_brt.getUTCMonth() + 1).padStart(2, '0')
const _hhmm = `${String(_brt.getUTCHours()).padStart(2, '0')}:${String(_brt.getUTCMinutes()).padStart(2, '0')}`

// Versão vem direto do package.json — atualizada manualmente a cada deploy
// "v0.3.279 · 17/06 14:30 BRT"
const _buildLabel = `v${_pkg.version} · ${_dd}/${_mm} ${_hhmm} BRT`

const nextConfig: NextConfig = {
  // No remotePatterns — all racket images are self-hosted under /public/raquetes/.
  // If next/image is used for external URLs in the future, add an explicit allowlist here.
  env: {
    BUILD_DATE:              _brt.toISOString().slice(0, 10),
    BUILD_SHA:               _sha,
    NEXT_PUBLIC_BUILD_LABEL: _buildLabel,
  },
};

export default nextConfig;
