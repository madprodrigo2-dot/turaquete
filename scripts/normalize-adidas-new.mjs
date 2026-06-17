import sharp from 'sharp'
import { mkdir, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const CANVAS_W = 800, CANVAS_H = 1020
const TARGET   = 0.88
const THR      = 235
const MARGIN   = 12
const INPUT    = 'public/raquetes'
const BACKUP   = 'public/raquetes/_original'
const OUTPUT   = 'public/raquetes/_normalized'

const FILES = [
  'adidas-rx-h14.webp',
  'adidas-rx-h24-carbon-3k.webp',
  'adidas-adipower-3-1-h24.webp',
  'adidas-adipower-carbon-h34.webp',
  'adidas-adipower-carbon-light-h31.webp',
  'adidas-adipower-lite-h14.webp',
]

async function detectBBox(src) {
  const { data, info } = await sharp(src)
    .flatten({ background: '#ffffff' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let x0 = width, x1 = 0, y0 = height, y1 = 0
  for (let y = 0; y < height; y++) {
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

async function normalizeImage(src, dst) {
  const bb = await detectBBox(src)
  const targetH = Math.round(TARGET * CANVAS_H)
  const scale   = targetH / bb.bh

  const left  = Math.max(0, bb.x0 - MARGIN)
  const top   = Math.max(0, bb.y0 - MARGIN)
  const right  = Math.min(CANVAS_W, bb.x1 + MARGIN + 1)
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

if (!existsSync(BACKUP)) await mkdir(BACKUP, { recursive: true })
if (!existsSync(OUTPUT)) await mkdir(OUTPUT, { recursive: true })

console.log(`\nNormalize Adidas new models — ${FILES.length} images\n`)
console.log(`${'File'.padEnd(44)} Before  Scale    Output`)
console.log('─'.repeat(70))

for (const file of FILES) {
  const src = path.join(INPUT, file)
  const bak = path.join(BACKUP, file)
  const dst = path.join(OUTPUT, file)
  try {
    if (!existsSync(bak)) await copyFile(src, bak)
    const result = await normalizeImage(src, dst)
    console.log(`${file.padEnd(44)} ${result.fillBefore.toFixed(3)}   ×${result.scale}  ${result.sw}×${result.sh}`)
  } catch (err) {
    console.error(`${file.padEnd(44)} ERROR: ${err.message}`)
  }
}

console.log(`\nDone. Next: Copy-Item public/raquetes/_normalized/adidas-*.webp public/raquetes/ -Force`)
