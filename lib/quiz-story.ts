import {
  ARQUETIPOS,
  type ArquetipoSlug,
  type ScoreMap,
} from './quiz-perfil'
import { QUIZ_RAQUETES } from './quiz-raquetes'

// ── Canvas dims ───────────────────────────────────────────────────────────────

const W    = 1080
const H    = 1920
const CX   = W / 2
const MX   = 80
const CW   = W - MX * 2

const WHITE = '#FFFFFF'
const ARENA = '#F7EDDC'   // cor areia — usada em texto/elementos quentes

// ── Identidades ───────────────────────────────────────────────────────────────

interface Identidade {
  bg:     string | [string, string]
  ac:     string
  numero: string
  quote:  string
}

const IDENTIDADES: Record<ArquetipoSlug, Identidade> = {
  muralha:           { bg: '#0E3A40', ac: '#0CC0BE', numero: '00', quote: 'Comigo não passa.'              },
  'contra-atacante': { bg: '#087F7D', ac: '#FFC42E', numero: '07', quote: 'Deixa vir.'                    },
  canhao:            { bg: '#E8492A', ac: '#FFC42E', numero: '09', quote: 'Se subiu, desceu.'              },
  'dono-da-rede':    { bg: '#0E3A40', ac: '#FF5E3A', numero: '01', quote: 'A rede tem dono.'              },
  finalizador:       { bg: '#143C46', ac: '#FFC42E', numero: '10', quote: 'Ponto curto, papo reto.'       },
  camaleao:          { bg: ['#0CC0BE', '#0E3A40'], ac: '#FFC42E', numero: '23', quote: 'Eu jogo o jogo que o jogo pede.' },
}

const POSTER_LINES: Record<ArquetipoSlug, string[]> = {
  muralha:           ['MURALHA'],
  'contra-atacante': ['CONTRA-', 'ATACANTE'],
  canhao:            ['CANHÃO'],
  'dono-da-rede':    ['DONO/A', 'DA REDE'],
  finalizador:       ['FINALIZADOR'],
  camaleao:          ['CAMALEÃO'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDisplayFont(): string {
  const ff = getComputedStyle(document.body).getPropertyValue('--font-display').trim()
  return ff || 'sans-serif'
}

function hexToRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width <= maxW) cur = test
    else { if (cur) lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines
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

function fitSz(ctx: CanvasRenderingContext2D, ff: string, text: string, maxW: number, lo = 40, hi = 220): number {
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    ctx.font = `800 ${mid}px '${ff}', sans-serif`
    if (ctx.measureText(text).width <= maxW) lo = mid
    else hi = mid
  }
  return lo
}

function letterSpaced(
  ctx: CanvasRenderingContext2D,
  text: string, cx: number, y: number, spacing: number,
) {
  const chars = [...text]
  const total = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1)
  let x = cx - total / 2
  ctx.textAlign = 'left'
  for (const c of chars) {
    ctx.fillText(c, x, y)
    x += ctx.measureText(c).width + spacing
  }
}

function divider(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save()
  ctx.strokeStyle = hexToRgba(ARENA, 0.20)
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(MX, y); ctx.lineTo(W - MX, y)
  ctx.stroke()
  ctx.restore()
}

// ── Background / grain ────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, bg: string | [string, string]) {
  if (Array.isArray(bg)) {
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, bg[0])
    grad.addColorStop(1, bg[1])
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = bg
  }
  ctx.fillRect(0, 0, W, H)

  // Overlay arena quente — suaviza o escuro e neutraliza o tom muito masculino
  const warm = ctx.createLinearGradient(0, 0, 0, H)
  warm.addColorStop(0,   'rgba(247,237,220,0.10)')
  warm.addColorStop(0.5, 'rgba(247,237,220,0.06)')
  warm.addColorStop(1,   'rgba(247,237,220,0.14)')
  ctx.fillStyle = warm
  ctx.fillRect(0, 0, W, H)
}

function drawGrain(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = hexToRgba(ARENA, 0.06)
  const step = 45
  for (let x = step / 2; x < W; x += step)
    for (let y = step / 2; y < H; y += step) {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill()
    }
}

function drawJerseyBg(ctx: CanvasRenderingContext2D, ff: string, numero: string, ac: string) {
  ctx.save()
  ctx.font         = `800 650px '${ff}', sans-serif`
  ctx.fillStyle    = hexToRgba(ac, 0.10)
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(numero, W + 90, 490)
  ctx.restore()
}

// ── 1. Header ─────────────────────────────────────────────────────────────────

function drawHeader(ctx: CanvasRenderingContext2D, ff: string, ac: string): number {
  ctx.save()
  ctx.font         = `600 34px '${ff}', sans-serif`
  ctx.fillStyle    = ac
  ctx.textBaseline = 'middle'
  letterSpaced(ctx, 'MEU PERFIL DE JOGO', CX, 110, 7)
  ctx.restore()
  return 127
}

// ── 2. Name block — sem artigo "O", left-aligned ──────────────────────────────

function drawNameBlock(
  ctx: CanvasRenderingContext2D,
  ff: string,
  words: string[],
  ac: string,
  badgeText: string,
  topY: number,
): number {
  const longest = words.reduce((a, b) => a.length > b.length ? a : b)
  const sz      = fitSz(ctx, ff, longest, W * 0.92)

  ctx.save()
  ctx.textBaseline = 'top'
  ctx.font         = `800 ${sz}px '${ff}', sans-serif`
  ctx.textAlign    = 'left'

  // First line
  ctx.fillStyle = hexToRgba(ac, 0.88)
  ctx.fillText(words[0], MX + 4, topY + 4)
  ctx.fillStyle = WHITE
  ctx.fillText(words[0], MX, topY)

  let lineBottom = topY + sz
  for (let i = 1; i < words.length; i++) {
    const ly = lineBottom + 6
    ctx.fillStyle = hexToRgba(ac, 0.88)
    ctx.fillText(words[i], MX + 4, ly + 4)
    ctx.fillStyle = WHITE
    ctx.fillText(words[i], MX, ly)
    lineBottom = ly + sz
  }

  // Badge pill
  const badgeTopY = lineBottom + 18
  ctx.font = `500 26px '${ff}', sans-serif`
  const bTw = ctx.measureText(badgeText).width
  const bPx = 28, bPy = 13
  const bW  = bTw + bPx * 2
  const bH  = 26 + bPy * 2
  ctx.strokeStyle = ac
  ctx.lineWidth   = 2
  ctx.globalAlpha = 0.80
  drawRoundRect(ctx, MX, badgeTopY, bW, bH, bH / 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.fillStyle   = ac
  ctx.textAlign   = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(badgeText, MX + bPx, badgeTopY + bH / 2)

  ctx.restore()
  return badgeTopY + bH
}

// ── 3. Quote ──────────────────────────────────────────────────────────────────

function drawQuote(ctx: CanvasRenderingContext2D, ff: string, quote: string, topY: number): number {
  ctx.save()
  ctx.font         = `italic 800 48px '${ff}', sans-serif`
  ctx.fillStyle    = hexToRgba(ARENA, 0.94)
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'top'
  const lines = wrapText(ctx, `"${quote}"`, 960)
  const lh    = 48 * 1.28
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, CX, topY + i * lh))
  ctx.restore()
  return topY + Math.min(lines.length, 2) * lh
}

// ── 4. Description ────────────────────────────────────────────────────────────

function drawDescription(ctx: CanvasRenderingContext2D, ff: string, text: string, topY: number): number {
  ctx.save()
  ctx.font         = `400 29px '${ff}', sans-serif`
  ctx.fillStyle    = hexToRgba(ARENA, 0.80)
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'top'
  const lines = wrapText(ctx, text, 880)
  const lh    = 29 * 1.58
  lines.slice(0, 5).forEach((l, i) => ctx.fillText(l, CX, topY + i * lh))
  ctx.restore()
  return topY + Math.min(lines.length, 5) * lh
}

// ── 5. Bars ───────────────────────────────────────────────────────────────────

function drawBars(
  ctx: CanvasRenderingContext2D,
  ff: string,
  scores: ScoreMap,
  winner: ArquetipoSlug,
  ac: string,
  topY: number,
): number {
  const top3 = (Object.entries(scores) as [ArquetipoSlug, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const maxScore = top3[0]?.[1] ?? 1

  ctx.save()
  ctx.font         = `700 26px '${ff}', sans-serif`
  ctx.fillStyle    = ARENA
  ctx.globalAlpha  = 0.72
  ctx.textBaseline = 'middle'
  letterSpaced(ctx, 'SEU JOGO EM NÚMEROS', CX, topY + 13, 4)
  ctx.globalAlpha  = 1
  ctx.restore()

  const ROW_H      = 64
  const BAR_H      = 12
  const barAreaTop = topY + 34

  top3.forEach(([slug, score], i) => {
    const pct  = Math.round((score / maxScore) * 100)
    const nome = ARQUETIPOS[slug].nome
    const rowY = barAreaTop + i * ROW_H
    const isW  = slug === winner

    ctx.save()

    ctx.font         = `${isW ? 700 : 400} 27px '${ff}', sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillStyle    = isW ? WHITE : hexToRgba(ARENA, 0.52)
    ctx.textAlign    = 'left'
    ctx.fillText(nome, MX, rowY)

    ctx.font      = `700 27px '${ff}', sans-serif`
    ctx.fillStyle = isW ? ac : hexToRgba(ARENA, 0.40)
    ctx.textAlign = 'right'
    ctx.fillText(`${pct}%`, W - MX, rowY)

    const barY = rowY + 37
    ctx.fillStyle = isW ? hexToRgba(ac, 0.18) : hexToRgba(ARENA, 0.10)
    drawRoundRect(ctx, MX, barY, CW, BAR_H, BAR_H / 2)
    ctx.fill()

    const fillW = Math.max((pct / 100) * CW, BAR_H)
    ctx.fillStyle = isW ? ac : hexToRgba(ARENA, 0.32)
    drawRoundRect(ctx, MX, barY, fillW, BAR_H, BAR_H / 2)
    ctx.fill()

    ctx.restore()
  })

  return barAreaTop + top3.length * ROW_H
}

// ── 6. Pontos Fortes ──────────────────────────────────────────────────────────

function drawPontosFortres(
  ctx: CanvasRenderingContext2D,
  ff: string,
  pontos: readonly string[],
  ac: string,
  topY: number,
): number {
  ctx.save()
  ctx.font         = `700 26px '${ff}', sans-serif`
  ctx.fillStyle    = ARENA
  ctx.globalAlpha  = 0.72
  ctx.textBaseline = 'middle'
  letterSpaced(ctx, 'PONTOS FORTES', CX, topY + 13, 4)
  ctx.globalAlpha  = 1
  ctx.restore()

  const BULLET_R = 7
  const BULLET_X = MX + BULLET_R
  const TEXT_X   = MX + BULLET_R * 2 + 16
  const PF_LH    = 56
  const firstY   = topY + 38

  pontos.forEach((pf, i) => {
    const fy = firstY + i * PF_LH + PF_LH / 2
    ctx.save()
    ctx.beginPath()
    ctx.arc(BULLET_X, fy, BULLET_R, 0, Math.PI * 2)
    ctx.fillStyle = ac
    ctx.fill()
    ctx.font         = `500 28px '${ff}', sans-serif`
    ctx.fillStyle    = hexToRgba(ARENA, 0.88)
    ctx.textAlign    = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(pf, TEXT_X, fy)
    ctx.restore()
  })

  return firstY + pontos.length * PF_LH
}

// ── 7. Minhas raquetes — chips com miniaturas ─────────────────────────────────

async function loadImage(imageUrl: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    const timer = setTimeout(() => resolve(null), 6000)
    img.onload  = () => { clearTimeout(timer); resolve(img) }
    img.onerror = () => { clearTimeout(timer); resolve(null) }
    // URLs locais (/raquetes/...) carregam direto — mesmo domínio, sem CORS
    // URLs externas passam pelo proxy para evitar canvas tainted
    if (imageUrl.startsWith('/')) {
      img.src = imageUrl
    } else {
      img.crossOrigin = 'anonymous'
      img.src = `/api/img-proxy?url=${encodeURIComponent(imageUrl)}`
    }
  })
}

async function drawMinhasRaquetes(
  ctx: CanvasRenderingContext2D,
  ff: string,
  winner: ArquetipoSlug,
  ac: string,
  topY: number,
): Promise<number> {
  const raquetes = (QUIZ_RAQUETES[winner] ?? []).slice(0, 3)
  if (!raquetes.length) return topY

  const imgs = await Promise.all(
    raquetes.map(r => (r.image_url ? loadImage(r.image_url) : Promise.resolve(null))),
  )
  const allFailed = imgs.every(img => img === null)
  if (allFailed && raquetes.every(r => !r.nome_curto)) return topY

  // Section label
  ctx.save()
  ctx.font         = `700 26px '${ff}', sans-serif`
  ctx.fillStyle    = ARENA
  ctx.globalAlpha  = 0.72
  ctx.textBaseline = 'middle'
  letterSpaced(ctx, 'MINHAS RAQUETES', CX, topY + 13, 4)
  ctx.globalAlpha  = 1
  ctx.restore()

  const CHIP_W   = 280
  const CHIP_H   = 180
  const GAP      = 24
  const TINTA    = '#0E3A40'
  const n        = raquetes.length
  const totalW   = n * CHIP_W + (n - 1) * GAP
  const startX   = CX - totalW / 2
  const chipTopY = topY + 34

  raquetes.forEach((r, i) => {
    const img   = imgs[i]
    const chipX = startX + i * (CHIP_W + GAP)

    ctx.save()

    // Chip — fundo arena
    ctx.fillStyle = ARENA
    drawRoundRect(ctx, chipX, chipTopY, CHIP_W, CHIP_H, 20)
    ctx.fill()

    // Imagem (contain na parte superior do chip)
    if (img && img.width > 0 && img.height > 0) {
      const maxW  = CHIP_W - 20
      const maxH  = 118
      const scale = Math.min(maxW / img.width, maxH / img.height)
      const dw    = img.width  * scale
      const dh    = img.height * scale
      const dx    = chipX + (CHIP_W - dw) / 2
      const dy    = chipTopY + 10 + (maxH - dh) / 2
      ctx.drawImage(img, dx, dy, dw, dh)
    }

    // Nome curto
    ctx.font = `600 22px '${ff}', sans-serif`
    const maxNomeW = CHIP_W - 16
    let nome = r.nome_curto || r.name
    while (ctx.measureText(nome).width > maxNomeW && nome.length > 3) {
      nome = nome.slice(0, -1)
    }
    if (nome !== (r.nome_curto || r.name)) nome = nome.trimEnd() + '…'

    ctx.fillStyle    = TINTA
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(nome, chipX + CHIP_W / 2, chipTopY + 152)

    ctx.restore()
  })

  return chipTopY + CHIP_H
}

// ── 8. Social hook ────────────────────────────────────────────────────────────

function drawHook(ctx: CanvasRenderingContext2D, ff: string, centerY: number): number {
  ctx.save()
  ctx.font         = `500 26px '${ff}', sans-serif`
  ctx.fillStyle    = hexToRgba(ARENA, 0.68)
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('E você, joga como?', CX, centerY)
  ctx.restore()
  return centerY + 13
}

// ── 9. Footer ─────────────────────────────────────────────────────────────────

function drawFooter(ctx: CanvasRenderingContext2D, ff: string, ac: string) {
  ctx.save()
  const logoY = H - 132
  const urlY  = H - 62

  ctx.font         = `800 50px '${ff}', sans-serif`
  ctx.textBaseline = 'middle'
  const tuW = ctx.measureText('tu').width
  const lgX = CX - (tuW + ctx.measureText('raquete').width) / 2
  ctx.fillStyle = ac;   ctx.textAlign = 'left'
  ctx.fillText('tu', lgX, logoY)
  ctx.fillStyle = WHITE
  ctx.fillText('raquete', lgX + tuW, logoY)

  ctx.font      = `600 36px '${ff}', sans-serif`
  ctx.fillStyle = hexToRgba(ARENA, 0.80)
  ctx.globalAlpha = 1
  ctx.textAlign = 'center'
  ctx.fillText('turaquete.com.br/perfil', CX, urlY)
  ctx.restore()
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function gerarStoryPNG(
  winner: ArquetipoSlug,
  scores: ScoreMap,
): Promise<Blob> {
  await document.fonts.ready

  const ff  = getDisplayFont()
  const id  = IDENTIDADES[winner]
  const arq = ARQUETIPOS[winner]

  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  drawBackground(ctx, id.bg)
  drawJerseyBg(ctx, ff, id.numero, id.ac)
  drawGrain(ctx)

  let y = drawHeader(ctx, ff, id.ac)
  y += 40

  y = drawNameBlock(ctx, ff, POSTER_LINES[winner], id.ac, `Baseado na ATP · ${arq.equivalente}`, y)
  y += 44

  y = drawQuote(ctx, ff, id.quote, y)
  y += 36

  y = drawDescription(ctx, ff, arq.descricao, y)
  y += 42

  divider(ctx, y)
  y += 42

  y = drawBars(ctx, ff, scores, winner, id.ac, y)
  y += 34

  divider(ctx, y)
  y += 40

  y = drawPontosFortres(ctx, ff, arq.pontosFortres, id.ac, y)
  y += 44

  y = await drawMinhasRaquetes(ctx, ff, winner, id.ac, y)
  y += 44

  drawHook(ctx, ff, y)
  drawFooter(ctx, ff, id.ac)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))),
      'image/png',
    )
  })
}
