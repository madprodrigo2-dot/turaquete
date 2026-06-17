import type { NextConfig } from "next";
import { execSync } from 'child_process'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const _pkg  = require('./package.json') as { version: string }
const _sha  = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? ''

// Patch auto-incrementado pelo número de commits git (funciona no Vercel com histórico completo)
let _patch = 0
try {
  _patch = parseInt(
    execSync('git rev-list --count HEAD', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim(),
    10,
  )
} catch { /* shallow clone ou sem git — mantém 0 */ }
const [_major, _minor] = _pkg.version.split('.')

// Horário de Brasília: BRT = UTC-3 (sem horário de verão desde 2019)
const _brt  = new Date(Date.now() - 3 * 60 * 60 * 1000)
const _dd   = String(_brt.getUTCDate()).padStart(2, '0')
const _mm   = String(_brt.getUTCMonth() + 1).padStart(2, '0')
const _hhmm = `${String(_brt.getUTCHours()).padStart(2, '0')}:${String(_brt.getUTCMinutes()).padStart(2, '0')}`

// "v0.3.42 · 17/06 14:30 BRT"
const _buildLabel = `v${_major}.${_minor}.${_patch} · ${_dd}/${_mm} ${_hhmm} BRT`

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
