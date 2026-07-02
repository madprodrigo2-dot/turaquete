import {
  ARQUETIPOS,
  RADAR_AXIS_ORDER,
  MAX_SCORE_PER_AXIS,
  type ArquetipoSlug,
  type ScoreMap,
} from './quiz-perfil'

// ── Canvas dimensions ─────────────────────────────────────────────────────────

const W  = 1080
const H  = 1920
const CX = W / 2

// ── Palette ──────────────────────────────────────────────────────────────────

const PETROLEO = '#0E3A40'
const AQUA     = '#0CC0BE'
const WHITE    = '#FFFFFF'
const CORAL    = '#FF5E3A'
const CREMA    = '#F5FBFA'

// ── Radar geometry ────────────────────────────────────────────────────────────

const RADAR_CY    = 910
const RADAR_R     = 290
const RADAR_LBL_R = RADAR_R + 68

// ── Content ───────────────────────────────────────────────────────────────────

const QUOTES: Record<ArquetipoSlug, string> = {
  muralha:          '"Paciência é a minha forma de pressão."',
  'contra-atacante': '"Minha defesa não é recuo: é armadilha."',
  canhao:           '"Quando a bola sobe, todo mundo já sabe o que vem."',
  'dono-da-rede':   '"A areia do fundo quase não conhece meus pés."',
  finalizador:      '"Quanto menos bolas, melhor."',
  camaleao:         '"Minha maior arma é não ter padrão."',
}

const RADAR_LABELS: Record<ArquetipoSlug, string> = {
  muralha:          'Muralha',
  canhao:           'Canhão',
  finalizador:      'Finalizador',
  'dono-da-rede':   'Rede',
  'contra-atacante': 'C-Atacante',
  camaleao:         'Camaleão',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function axisAngle(idx: number): number {
  return ((-90 + idx * 60) * Math.PI) / 180
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y,     x + w, y + r,     r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x,     y + h, x,     y + h - r, r)
  ctx.lineTo(x,     y + r)
  ctx.arcTo(x,     y,     x + r, y,         r)
  ctx.closePath()
}

function drawLetterSpaced(
  ctx: CanvasRenderingContext2D,
  text: string, cx: number, y: number, spacing: number,
) {
  const chars = [...text]
  const total = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1)
  let x = cx - total / 2
  for (const c of chars) {
    ctx.fillText(c, x, y)
    x += ctx.measureText(c).width + spacing
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width <= maxW) { cur = test }
    else { if (cur) lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines
}

// Read the actual font-family registered by next/font (obfuscated class name)
function getDisplayFont(): string {
  const ff = getComputedStyle(document.body).getPropertyValue('--font-display').trim()
  return ff || 'sans-serif'
}

// ── Drawing routines ──────────────────────────────────────────────────────────

function drawGrain(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle   = AQUA
  ctx.globalAlpha = 0.04
  const step = 36
  for (let x = step / 2; x < W; x += step) {
    for (let y = step / 2; y < H; y += step) {
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

function drawRadar(ctx: CanvasRenderingContext2D, scores: ScoreMap, ff: string) {
  const cy = RADAR_CY
  const R  = RADAR_R

  // Grid hex rings
  for (const frac of [1 / 3, 2 / 3, 1]) {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a  = axisAngle(i)
      const px = CX + frac * R * Math.cos(a)
      const py = cy  + frac * R * Math.sin(a)
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.strokeStyle = AQUA
    ctx.lineWidth   = 1.5
    ctx.globalAlpha = 0.22
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Axis spokes
  ctx.lineWidth = 1
  for (let i = 0; i < 6; i++) {
    const a = axisAngle(i)
    ctx.beginPath()
    ctx.moveTo(CX, cy)
    ctx.lineTo(CX + R * Math.cos(a), cy + R * Math.sin(a))
    ctx.strokeStyle = AQUA
    ctx.globalAlpha = 0.12
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Data polygon
  const pts = RADAR_AXIS_ORDER.map((slug, i) => {
    const ratio = Math.min(scores[slug] / MAX_SCORE_PER_AXIS, 1)
    const a = axisAngle(i)
    return { x: CX + ratio * R * Math.cos(a), y: cy + ratio * R * Math.sin(a) }
  })

  ctx.beginPath()
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.closePath()
  ctx.fillStyle   = CORAL
  ctx.globalAlpha = 0.28
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = CORAL
  ctx.lineWidth   = 4
  ctx.stroke()

  // Vertex dots
  ctx.fillStyle = CORAL
  for (const p of pts) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
    ctx.fill()
  }

  // Axis labels
  ctx.font         = `500 27px ${ff}, sans-serif`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle    = CREMA
  ctx.globalAlpha  = 0.85
  for (let i = 0; i < 6; i++) {
    const slug = RADAR_AXIS_ORDER[i]
    const a    = axisAngle(i)
    ctx.fillText(RADAR_LABELS[slug], CX + RADAR_LBL_R * Math.cos(a), cy + RADAR_LBL_R * Math.sin(a))
  }
  ctx.globalAlpha = 1
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function gerarStoryPNG(winner: ArquetipoSlug, scores: ScoreMap): Promise<Blob> {
  // Wait for all fonts loaded by next/font to be ready
  await document.fonts.ready

  const ff     = getDisplayFont()
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx    = canvas.getContext('2d')!

  // ── Background ────────────────────────────────────────────────
  ctx.fillStyle = PETROLEO
  ctx.fillRect(0, 0, W, H)
  drawGrain(ctx)

  const arq = ARQUETIPOS[winner]

  // ── 1. Label "MEU PERFIL DE JOGO" (y=200) ───────────────────
  ctx.font         = `600 40px ${ff}, sans-serif`
  ctx.fillStyle    = AQUA
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'center'
  drawLetterSpaced(ctx, 'MEU PERFIL DE JOGO', CX, 200, 8)

  // ── 2. Archetype name — adaptive size (y=340) ─────────────────
  const nomeUpper = arq.nome.toUpperCase()
  let nameSize = 70
  for (const sz of [110, 90, 80, 70]) {
    ctx.font = `800 ${sz}px ${ff}, sans-serif`
    if (ctx.measureText(nomeUpper).width <= 960) { nameSize = sz; break }
  }
  ctx.font         = `800 ${nameSize}px ${ff}, sans-serif`
  ctx.fillStyle    = WHITE
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'

  if (ctx.measureText(nomeUpper).width <= 960) {
    ctx.fillText(nomeUpper, CX, 340)
  } else {
    // Wrap to 2 lines as last resort
    const lines = wrapText(ctx, nomeUpper, 960)
    const lh    = nameSize * 1.18
    const sy    = 340 - ((lines.length - 1) * lh) / 2
    lines.forEach((l, i) => ctx.fillText(l, CX, sy + i * lh))
  }

  // ── 3. Badge pill (y=480) ─────────────────────────────────────
  const badgeText = `${arq.equivalente} · estilo do tênis pro`
  ctx.font = `500 30px ${ff}, sans-serif`
  const bTw = ctx.measureText(badgeText).width
  const bPx = 38
  const bPy = 18
  const bW  = bTw + bPx * 2
  const bH  = 30 + bPy * 2
  const bX  = CX - bW / 2
  const bY  = 480 - bH / 2

  ctx.strokeStyle  = AQUA
  ctx.lineWidth    = 1.5
  ctx.globalAlpha  = 0.8
  drawRoundRect(ctx, bX, bY, bW, bH, bH / 2)
  ctx.stroke()
  ctx.globalAlpha  = 1
  ctx.fillStyle    = AQUA
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(badgeText, CX, 480)

  // ── 4. Radar (center y=910) ───────────────────────────────────
  drawRadar(ctx, scores, ff)

  // ── 5. Quote (y=1310) ─────────────────────────────────────────
  ctx.font         = `italic 500 34px ${ff}, sans-serif`
  ctx.fillStyle    = CREMA
  ctx.globalAlpha  = 0.82
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  const qLines = wrapText(ctx, QUOTES[winner], 900)
  const qLH    = 34 * 1.48
  const qSY    = 1310 - ((qLines.length - 1) * qLH) / 2
  qLines.forEach((l, i) => ctx.fillText(l, CX, qSY + i * qLH))
  ctx.globalAlpha = 1

  // ── 6. Logo "tu" aqua + "raquete" branco (y=1520) ────────────
  ctx.font         = `800 56px ${ff}, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'left'
  const tuW = ctx.measureText('tu').width
  const raW = ctx.measureText('raquete').width
  const lgX = CX - (tuW + raW) / 2
  ctx.fillStyle = AQUA
  ctx.fillText('tu', lgX, 1520)
  ctx.fillStyle = WHITE
  ctx.fillText('raquete', lgX + tuW, 1520)

  // ── 7. CTA lines (y=1645 / y=1718) ───────────────────────────
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.font         = `500 30px ${ff}, sans-serif`
  ctx.fillStyle    = CREMA
  ctx.globalAlpha  = 0.55
  ctx.fillText('Descubra o seu em', CX, 1645)
  ctx.globalAlpha  = 1
  ctx.font         = `600 38px ${ff}, sans-serif`
  ctx.fillStyle    = CORAL
  ctx.fillText('turaquete.com.br/perfil', CX, 1718)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))),
      'image/png',
    )
  })
}
