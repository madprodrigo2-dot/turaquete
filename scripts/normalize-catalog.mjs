import sharp from 'sharp'
import { mkdir, copyFile, readdir, rename, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const CANVAS_W = 800, CANVAS_H = 1020
const TARGET   = 0.88
const THR      = 235
const MARGIN   = 12
const INPUT    = 'public/raquetes'
const BACKUP   = 'public/raquetes/_original'
const OUTPUT   = 'public/raquetes/_normalized'

// Images to skip — bbox normalize would produce worse results than the original.
// Categories:
//   promo-graphic : AMA Sport images with large external brand text/title above the racket
//   promo-badge   : promotional badge or banner overlaid on an otherwise clean photo
//   studio-bg     : non-white studio background (gray, dark, etc.)
//   bundle-photo  : product shot includes bag/balls/accessories alongside the racket
const SKIP_REASON = {
  // promo-graphic — AMA Sport
  'athena.webp':              'promo-graphic',
  'athena-midnight-26.webp':  'promo-graphic',
  'athena-pink-26.webp':      'promo-graphic',
  'classic-bee.webp':         'promo-graphic',
  'kronos-25.webp':           'promo-graphic',
  'kronos-6th-generation.webp': 'promo-graphic',
  'kronos-gold-titanium.webp':  'promo-graphic',
  'kronos-white-titanium-24.webp': 'promo-graphic',
  'medusa-25.webp':           'promo-graphic',
  'poison-bee.webp':          'promo-graphic',
  'poison-bee-2026.webp':     'promo-graphic',
  'poison-bee-original.webp': 'promo-graphic',
  'proteo-25.webp':           'promo-graphic',
  'proteo-2026.webp':         'promo-graphic',
  // promo-badge — promotional overlay on otherwise clean photo
  'nox-ng17-2026.webp':            'promo-badge',
  'nox-v10-2026.webp':             'promo-badge',
  'nox-varadero-2026.webp':        'promo-badge',
  'ocean-air-bt-bullet-7-0.webp':  'promo-badge',
  'ocean-air-bt-cruiser-2025.webp': 'promo-badge',
  'ocean-air-bt-destroyer.webp':   'promo-badge',
  'ocean-air-bt-enterprise-2025.webp': 'promo-badge',
  'ocean-air-bt-phenom.webp':      'promo-badge',
  // studio-bg — non-white studio background
  'fobel-cheetah.webp':          'studio-bg',
  'fobel-falcon.webp':           'studio-bg',
  'fobel-fox.webp':              'studio-bg',
  'fobel-husky.webp':            'studio-bg',
  'fobel-macaw.webp':            'studio-bg',
  'fobel-macaw-onyx.webp':       'studio-bg',
  'kona-bulldog-black-2026.webp':  'studio-bg',
  'kona-gladiator-steel-2026.webp': 'studio-bg',
  'kona-k-doze-black-2026.webp':   'studio-bg',
  'kona-k-doze-grafite-2025.webp': 'studio-bg',
  'kona-maddox-guga.webp':         'studio-bg',
  'kona-maverick-black-2025.webp': 'studio-bg',
  'kona-traktor-gray-2026.webp':   'studio-bg',
  'kona-traktor-orange-2025.webp': 'studio-bg',
  'minimalist-star-2026.webp':     'studio-bg',
  // bundle-photo — racket shown with bag/balls/accessories
  'mormaii-triax-24k.webp': 'bundle-photo',
  // low-contrast — background too light, bbox detection finds no pixels; needs cleaner photo
  'adidas-adipower-3-3-h14.webp':       'low-contrast',
  'adidas-adipower-3-3-h24.webp':       'low-contrast',
  'adidas-metalbone-team-3-3-h31.webp': 'low-contrast',
  'adidas-rx-h24.webp':                 'low-contrast',
}

const SKIP_FILES = new Set(Object.keys(SKIP_REASON))
const TOP_SKIP_FILES = new Set([])

async function detectBBox(src, topSkip = 0) {
  const { data, info } = await sharp(src)
    .flatten({ background: '#ffffff' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let x0 = width, x1 = 0, y0 = height, y1 = 0
  for (let y = topSkip; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (data[i] < THR || data[i+1] < THR || data[i+2] < THR) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  const bh = y1 - y0 + 1
  return { x0, x1, y0, y1, bh, fillH: bh / height }
}

async function normalizeImage(src, dst, topSkip = 0) {
  const bb = await detectBBox(src, topSkip)
  const targetH = Math.round(TARGET * CANVAS_H)
  const scale   = targetH / bb.bh

  const left  = Math.max(0, bb.x0 - MARGIN)
  const top   = Math.max(0, bb.y0 - MARGIN)
  const right = Math.min(CANVAS_W, bb.x1 + MARGIN + 1)
  const bot   = Math.min(CANVAS_H, bb.y1 + MARGIN + 1)
  const ew = right - left
  const eh = bot - top

  const sw = Math.min(Math.round(ew * scale), CANVAS_W)
  const sh = Math.min(Math.round(eh * scale), CANVAS_H)

  const pl = Math.round((CANVAS_W - sw) / 2)
  const pt = Math.round((CANVAS_H - sh) / 2)
  const pr = CANVAS_W - sw - pl
  const pb = CANVAS_H - sh - pt

  await sharp(src)
    .extract({ left, top, width: ew, height: eh })
    .resize(sw, sh, { fit: 'fill', kernel: 'lanczos3' })
    .extend({
      top: pt,
      bottom: Math.max(0, pb),
      left: pl,
      right: Math.max(0, pr),
      background: { r: 255, g: 255, b: 255 },
    })
    .webp({ quality: 90 })
    .toFile(dst)

  return { fillBefore: bb.fillH, scale: scale.toFixed(3), sw, sh }
}

// ── main ──────────────────────────────────────────────────────────────────────

if (!existsSync(BACKUP)) await mkdir(BACKUP, { recursive: true })
if (!existsSync(OUTPUT)) await mkdir(OUTPUT, { recursive: true })

const allFiles = (await readdir(INPUT)).filter(f => f.endsWith('.webp') && !f.startsWith('_'))

console.log(`\nNormalize catalog — ${allFiles.length} images found`)
console.log(`Target: fillH=${TARGET} (${Math.round(TARGET * CANVAS_H)}px / ${CANVAS_H}px)`)
console.log(`Output → ${OUTPUT}  (run 'Replace-to-public' step after reviewing)\n`)
console.log(`${'File'.padEnd(42)} Before  Scale    Output   Flags`)
console.log('─'.repeat(75))

let normalized = 0, skipped = 0, errors = 0

for (const file of allFiles) {
  const src = path.join(INPUT, file)
  const bak = path.join(BACKUP, file)

  if (SKIP_FILES.has(file)) {
    console.log(`${file.padEnd(42)} SKIP (${SKIP_REASON[file]})`)
    skipped++
    continue
  }

  try {
    // Backup original (only if not already backed up)
    if (!existsSync(bak)) await copyFile(src, bak)

    const topSkip = TOP_SKIP_FILES.has(file) ? 150 : 0
    const dst     = path.join(OUTPUT, file)
    const result  = await normalizeImage(src, dst, topSkip)
    const flags   = topSkip ? ' [topSkip]' : ''
    console.log(
      `${file.padEnd(42)} ${result.fillBefore.toFixed(3)}   ×${result.scale}  ${String(result.sw + '×' + result.sh).padEnd(9)}${flags}`
    )
    normalized++
  } catch (err) {
    console.error(`${file.padEnd(42)} ERROR: ${err.message}`)
    errors++
  }
}

console.log(`\nDone — ${normalized} normalized, ${skipped} skipped, ${errors} errors`)
console.log(`Originals backed up in: ${BACKUP}`)
console.log(`Normalized images in:   ${OUTPUT}`)
if (errors === 0) {
  console.log('\nNext step: Copy-Item public/raquetes/_normalized/*.webp public/raquetes/ -Force')
}
