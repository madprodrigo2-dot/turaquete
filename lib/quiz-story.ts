import {
  ARQUETIPOS,
  type ArquetipoSlug,
  type ScoreMap,
} from './quiz-perfil'
import { QUIZ_RAQUETES } from './quiz-raquetes'

// ── Canvas dims ───────────────────────────────────────────────────────────────

const W  = 1080
const H  = 1920
const CX = W / 2
const MX = 80          // horizontal margin
const CW = W - MX * 2  // content width = 920

const WHITE = '#FFFFFF'

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
  'dono-da-rede':    ['DONO', 'DA REDE'],
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

// Binary search: largest integer sz where text fits maxW (textBaseline irrelevant here)
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

function divider(ctx: CanvasRenderingContext2D, ac: string, y: number) {
  ctx.save()
  ctx.strokeStyle = hexToRgba(ac, 0.22)
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(MX, y); ctx.lineTo(W - MX, y)
  ctx.stroke()
  ctx.restore()
}

// ── Drawing routines — each returns bottom Y of drawn element ─────────────────

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
}

function drawGrain(ctx: CanvasRenderingContext2D, ac: string) {
  ctx.fillStyle = hexToRgba(ac, 0.07)
  const step = 45
  for (let x = step / 2; x < W; x += step)
    for (let y = step / 2; y < H; y += step) {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill()
    }
}

// Jersey number — behind zones 2-4 (y≈175-850), right side, clipped
function drawJerseyBg(ctx: CanvasRenderingContext2D, ff: string, numero: string, ac: string) {
  ctx.save()
  ctx.font         = `800 650px '${ff}', sans-serif`
  ctx.fillStyle    = hexToRgba(ac, 0.10)
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(numero, W + 90, 490)
  ctx.restore()
}

// 1. Header → returns bottom Y
function drawHeader(ctx: CanvasRenderingContext2D, ff: string, ac: string): number {
  ctx.save()
  ctx.font         = `600 34px '${ff}', sans-serif`
  ctx.fillStyle    = ac
  ctx.textBaseline = 'middle'
  letterSpaced(ctx, 'MEU PERFIL DE JOGO', CX, 110, 7)
  ctx.restore()
  return 127  // 110 + 17 (half line-height)
}

// 2. Name block — left-aligned, returns bottom Y
function drawNameBlock(
  ctx: CanvasRenderingContext2D,
  ff: string,
  words: string[],
  ac: string,
  badgeText: string,
  topY: number,
): number {
  // Auto-fit: longest word in 90% of W
  const longest = words.reduce((a, b) => a.length > b.length ? a : b)
  const sz      = fitSz(ctx, ff, longest, W * 0.90)
  const oSz     = Math.round(sz * 0.35)
  const lh      = Math.round(sz * 1.10)

  ctx.save()
  ctx.textBaseline = 'top'

  // "O" prefix
  ctx.font      = `800 ${oSz}px '${ff}', sans-serif`
  ctx.fillStyle = hexToRgba(ac, 0.78)
  ctx.textAlign = 'left'
  const oW = ctx.measureText('O ').width

  // First line: O + words[0]
  ctx.fillText('O', MX, topY)
  ctx.font = `800 ${sz}px '${ff}', sans-serif`
  // shadow
  ctx.fillStyle = hexToRgba(ac, 0.90)
  ctx.fillText(words[0], MX + oW + 4, topY + 4)
  // text
  ctx.fillStyle = WHITE
  ctx.fillText(words[0], MX + oW, topY)

  let lineBottom = topY + sz
  for (let i = 1; i < words.length; i++) {
    const ly = lineBottom + 6
    ctx.fillStyle = hexToRgba(ac, 0.90)
    ctx.fillText(words[i], MX + 4, ly + 4)
    ctx.fillStyle = WHITE
    ctx.fillText(words[i], MX, ly)
    lineBottom = ly + sz
  }

  // Badge pill
  const badgeTopY = lineBottom + 20
  ctx.font = `500 26px '${ff}', sans-serif`
  const bTw = ctx.measureText(badgeText).width
  const bPx = 28, bPy = 13
  const bW  = bTw + bPx * 2
  const bH  = 26 + bPy * 2
  const bX  = MX
  const bY  = badgeTopY

  ctx.strokeStyle = ac
  ctx.lineWidth   = 2
  ctx.globalAlpha = 0.85
  drawRoundRect(ctx, bX, bY, bW, bH, bH / 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.fillStyle   = ac
  ctx.textAlign   = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(badgeText, bX + bPx, bY + bH / 2)

  ctx.restore()
  return bY + bH
}

// 3. Quote — centered, max 2 lines, returns bottom Y
function drawQuote(ctx: CanvasRenderingContext2D, ff: string, quote: string, topY: number): number {
  ctx.save()
  ctx.font         = `italic 800 48px '${ff}', sans-serif`
  ctx.fillStyle    = 'rgba(255,255,255,0.92)'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'top'
  const lines = wrapText(ctx, `"${quote}"`, 960)
  const lh    = 48 * 1.28
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, CX, topY + i * lh))
  ctx.restore()
  return topY + Math.min(lines.length, 2) * lh
}

// 4. Description — centered, max 5 lines, returns bottom Y
function drawDescription(ctx: CanvasRenderingContext2D, ff: string, text: string, topY: number): number {
  ctx.save()
  ctx.font         = `400 29px '${ff}', sans-serif`
  ctx.fillStyle    = 'rgba(255,255,255,0.86)'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'top'
  const lines = wrapText(ctx, text, 880)
  const lh    = 29 * 1.58
  lines.slice(0, 5).forEach((l, i) => ctx.fillText(l, CX, topY + i * lh))
  ctx.restore()
  return topY + Math.min(lines.length, 5) * lh
}

// 5. Bars — returns bottom Y
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

  // Section label
  ctx.save()
  ctx.font         = `700 26px '${ff}', sans-serif`
  ctx.fillStyle    = ac
  ctx.globalAlpha  = 0.78
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'middle'
  letterSpaced(ctx, 'SEU JOGO EM NÚMEROS', CX, topY + 13, 4)
  ctx.globalAlpha = 1
  ctx.restore()

  const ROW_H  = 64
  const BAR_H  = 12
  const barAreaTop = topY + 34

  top3.forEach(([slug, score], i) => {
    const pct  = Math.round((score / maxScore) * 100)
    const nome = ARQUETIPOS[slug].nome
    const rowY = barAreaTop + i * ROW_H
    const isW  = slug === winner

    ctx.save()

    // Label + percentage on same row
    ctx.font         = `${isW ? 700 : 500} 27px '${ff}', sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillStyle    = isW ? WHITE : 'rgba(255,255,255,0.60)'
    ctx.textAlign    = 'left'
    ctx.fillText(nome, MX, rowY)

    ctx.font      = `700 27px '${ff}', sans-serif`
    ctx.fillStyle = isW ? ac : 'rgba(255,255,255,0.45)'
    ctx.textAlign = 'right'
    ctx.fillText(`${pct}%`, W - MX, rowY)

    // Bar track
    const barY = rowY + 37
    ctx.fillStyle = isW ? hexToRgba(ac, 0.18) : 'rgba(255,255,255,0.10)'
    drawRoundRect(ctx, MX, barY, CW, BAR_H, BAR_H / 2)
    ctx.fill()

    // Bar fill
    const fillW = Math.max((pct / 100) * CW, BAR_H)
    ctx.fillStyle = isW ? ac : 'rgba(255,255,255,0.38)'
    drawRoundRect(ctx, MX, barY, fillW, BAR_H, BAR_H / 2)
    ctx.fill()

    ctx.restore()
  })

  return barAreaTop + top3.length * ROW_H
}

// 6. Pontos Fortes — returns bottom Y
function drawPontosFortres(
  ctx: CanvasRenderingContext2D,
  ff: string,
  pontos: readonly string[],
  ac: string,
  topY: number,
): number {
  ctx.save()
  ctx.font         = `700 26px '${ff}', sans-serif`
  ctx.fillStyle    = ac
  ctx.globalAlpha  = 0.78
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
    ctx.fillStyle    = 'rgba(255,255,255,0.86)'
    ctx.textAlign    = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(pf, TEXT_X, fy)
    ctx.restore()
  })

  return firstY + pontos.length * PF_LH
}

// 7. Minhas armas — 3 primeiros nomes curtos, 1 linha — returns bottom Y
function drawMinhasArmas(
  ctx: CanvasRenderingContext2D,
  ff: string,
  winner: ArquetipoSlug,
  ac: string,
  centerY: number,
): number {
  const names = (QUIZ_RAQUETES[winner] ?? []).slice(0, 3).map(c => c.nome_curto).filter(Boolean)
  if (!names.length) return centerY + 14

  const SEP   = ' · '
  const LABEL = 'Minhas armas: '
  const MAX_W = CW

  ctx.save()
  ctx.font = `600 28px '${ff}', sans-serif`

  let display = [...names]
  // Truncate excess names until fits
  while (display.length > 1 && ctx.measureText(LABEL + display.join(SEP)).width > MAX_W) {
    display.pop()
    if (ctx.measureText(LABEL + [...display, '…'].join(SEP)).width <= MAX_W) {
      display.push('…')
      break
    }
  }

  const labelW  = ctx.measureText(LABEL).width
  const nameStr = display.join(SEP)
  const totalW  = labelW + ctx.measureText(nameStr).width
  const startX  = CX - totalW / 2

  ctx.textAlign    = 'left'
  ctx.textBaseline = 'middle'
  ctx.globalAlpha  = 0.90
  ctx.fillStyle    = ac
  ctx.fillText(LABEL, startX, centerY)
  ctx.globalAlpha  = 1
  ctx.fillStyle    = 'rgba(255,255,255,0.78)'
  ctx.fillText(nameStr, startX + labelW, centerY)
  ctx.restore()

  return centerY + 14
}

// 8. Social hook — returns bottom Y
function drawHook(ctx: CanvasRenderingContext2D, ff: string, centerY: number): number {
  ctx.save()
  ctx.font         = `500 26px '${ff}', sans-serif`
  ctx.fillStyle    = 'rgba(255,255,255,0.70)'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('E você, joga como? Marca teu parceiro de dupla.', CX, centerY)
  ctx.restore()
  return centerY + 13
}

// 9. Footer — always at bottom, ignores Y input
function drawFooter(ctx: CanvasRenderingContext2D, ff: string, ac: string) {
  ctx.save()
  const logoY = H - 132
  const urlY  = H - 62

  ctx.font         = `800 50px '${ff}', sans-serif`
  ctx.textBaseline = 'middle'
  const tuW = ctx.measureText('tu').width
  const raW = ctx.measureText('raquete').width
  const lgX = CX - (tuW + raW) / 2
  ctx.fillStyle = ac;  ctx.textAlign = 'left'
  ctx.fillText('tu', lgX, logoY)
  ctx.fillStyle = WHITE
  ctx.fillText('raquete', lgX + tuW, logoY)

  ctx.font      = `600 36px '${ff}', sans-serif`
  ctx.fillStyle = WHITE; ctx.globalAlpha = 0.88; ctx.textAlign = 'center'
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

  // ── Background + jersey number (decorativo) + grain ──────────────────────
  drawBackground(ctx, id.bg)
  drawJerseyBg(ctx, ff, id.numero, id.ac)
  drawGrain(ctx, id.ac)

  // ── Content — Y tracking ──────────────────────────────────────────────────

  let y = drawHeader(ctx, ff, id.ac)   // → ~127
  y += 40

  // 2. Name block
  y = drawNameBlock(ctx, ff, POSTER_LINES[winner], id.ac, `${arq.equivalente} · estilo do tênis pro`, y)
  y += 44

  // 3. Quote
  y = drawQuote(ctx, ff, id.quote, y)
  y += 36

  // 4. Description
  y = drawDescription(ctx, ff, arq.descricao, y)
  y += 42

  // ── Divider 1 ─────────────────────────────────────────────────────────────
  divider(ctx, id.ac, y)
  y += 42

  // 5. Bars
  y = drawBars(ctx, ff, scores, winner, id.ac, y)
  y += 34

  // ── Divider 2 ─────────────────────────────────────────────────────────────
  divider(ctx, id.ac, y)
  y += 40

  // 6. Pontos Fortes
  y = drawPontosFortres(ctx, ff, arq.pontosFortres, id.ac, y)
  y += 44

  // 7. Minhas armas (3 primeiros)
  y = drawMinhasArmas(ctx, ff, winner, id.ac, y)
  y += 52

  // 8. Social hook
  drawHook(ctx, ff, y)

  // 9. Footer (fixed at bottom)
  drawFooter(ctx, ff, id.ac)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))),
      'image/png',
    )
  })
}
