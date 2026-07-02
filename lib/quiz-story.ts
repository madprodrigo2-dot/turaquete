import {
  ARQUETIPOS,
  type ArquetipoSlug,
  type ScoreMap,
} from './quiz-perfil'
import { QUIZ_RAQUETES } from './quiz-raquetes'

// ── Canvas ────────────────────────────────────────────────────────────────────

const W  = 1080
const H  = 1920
const CX = W / 2

const WHITE = '#FFFFFF'
const ROT   = -6 * (Math.PI / 180)   // -6°

// ── Identidades visuais (6 — fixas) ──────────────────────────────────────────

interface Identidade {
  bg:     string | [string, string]   // solid or [top, bottom] for gradient
  ac:     string
  numero: string
  quote:  string
}

const IDENTIDADES: Record<ArquetipoSlug, Identidade> = {
  muralha: {
    bg: '#0E3A40', ac: '#0CC0BE', numero: '00',
    quote: 'Comigo não passa.',
  },
  'contra-atacante': {
    bg: '#087F7D', ac: '#FFC42E', numero: '07',
    quote: 'Deixa vir.',
  },
  canhao: {
    bg: '#E8492A', ac: '#FFC42E', numero: '09',
    quote: 'Se subiu, desceu.',
  },
  'dono-da-rede': {
    bg: '#0E3A40', ac: '#FF5E3A', numero: '01',
    quote: 'A rede tem dono.',
  },
  finalizador: {
    bg: '#143C46', ac: '#FFC42E', numero: '10',
    quote: 'Ponto curto, papo reto.',
  },
  camaleao: {
    bg: ['#0CC0BE', '#0E3A40'], ac: '#FFC42E', numero: '23',
    quote: 'Eu jogo o jogo que o jogo pede.',
  },
}

// Linhas de composição do nome (palavra por linha)
const POSTER_LINES: Record<ArquetipoSlug, { small: string; large: string[] }> = {
  muralha:           { small: 'O', large: ['MURALHA']              },
  'contra-atacante': { small: 'O', large: ['CONTRA-', 'ATACANTE']  },
  canhao:            { small: 'O', large: ['CANHÃO']               },
  'dono-da-rede':    { small: 'O', large: ['DONO', 'DA REDE']      },
  finalizador:       { small: 'O', large: ['FINALIZADOR']          },
  camaleao:          { small: 'O', large: ['CAMALEÃO']             },
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

// Adaptive font size: largest that fits text in maxW
function fitSize(
  ctx: CanvasRenderingContext2D,
  ff: string,
  text: string,
  startSz: number,
  minSz: number,
  maxW: number,
): number {
  let sz = startSz
  while (sz > minSz) {
    ctx.font = `800 ${sz}px ${ff}, sans-serif`
    if (ctx.measureText(text).width <= maxW) break
    sz -= 5
  }
  return Math.max(sz, minSz)
}

// ── Drawing routines ──────────────────────────────────────────────────────────

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
  for (let x = step / 2; x < W; x += step) {
    for (let y = step / 2; y < H; y += step) {
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawJerseyNumber(ctx: CanvasRenderingContext2D, ff: string, numero: string, ac: string) {
  const SZ = 1000
  ctx.save()
  ctx.font          = `800 ${SZ}px ${ff}, sans-serif`
  ctx.fillStyle     = hexToRgba(ac, 0.12)
  ctx.textAlign     = 'right'
  ctx.textBaseline  = 'alphabetic'
  // Right-aligned past the canvas edge → partially cropped
  ctx.fillText(numero, W + 160, H * 0.60)
  ctx.restore()
}

function drawHeader(ctx: CanvasRenderingContext2D, ff: string, ac: string) {
  ctx.save()
  ctx.font         = `600 36px ${ff}, sans-serif`
  ctx.fillStyle    = ac
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'center'
  drawLetterSpaced(ctx, 'MEU PERFIL DE JOGO', CX, 140, 7)
  ctx.restore()
}

function drawNameBlock(
  ctx: CanvasRenderingContext2D,
  ff: string,
  lines: { small: string; large: string[] },
  ac: string,
  badgeText: string,
): void {
  const PIVOT_Y  = 780
  const MAX_W    = 960
  const SHADOW_O = 6   // hard shadow offset px

  // ── Calcular tamanho das linhas grandes ──
  let largeSz: number
  if (lines.large.length === 1) {
    // Palavra única: começa grande
    largeSz = fitSize(ctx, ff, lines.large[0], 210, 90, MAX_W)
  } else {
    // Múltiplas palavras: todas devem caber
    let sz = 170
    while (sz > 80) {
      ctx.font = `800 ${sz}px ${ff}, sans-serif`
      if (lines.large.every(w => ctx.measureText(w).width <= MAX_W)) break
      sz -= 5
    }
    largeSz = Math.max(sz, 80)
  }

  const smallLH = 80 * 1.15
  const largeLH = largeSz * 1.12
  const totalH  = smallLH + lines.large.length * largeLH

  // Posições Y relativas ao pivot (em coords rotacionadas)
  const relSmallY  = -totalH / 2 + smallLH / 2
  const relLarge0Y = -totalH / 2 + smallLH + largeLH / 2

  ctx.save()
  ctx.translate(CX, PIVOT_Y)
  ctx.rotate(ROT)
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'

  // "O" — prefixo em acento, sutil
  ctx.font         = `800 80px ${ff}, sans-serif`
  ctx.fillStyle    = hexToRgba(ac, 0.80)
  ctx.fillText(lines.small, 0, relSmallY)

  // Palavras grandes com sombra dura
  lines.large.forEach((word, i) => {
    const relY = relLarge0Y + i * largeLH
    ctx.font = `800 ${largeSz}px ${ff}, sans-serif`
    // Sombra dura (offset, cor acento)
    ctx.fillStyle = hexToRgba(ac, 0.95)
    ctx.fillText(word, SHADOW_O, relY + SHADOW_O)
    // Texto principal (branco)
    ctx.fillStyle = WHITE
    ctx.fillText(word, 0, relY)
  })

  // Badge ATP — logo abaixo do bloco, mesma rotação
  const blockBottom = totalH / 2
  ctx.font = `500 28px ${ff}, sans-serif`
  const bTw = ctx.measureText(badgeText).width
  const bPx = 30, bPy = 14
  const bW  = bTw + bPx * 2
  const bH  = 28 + bPy * 2
  const badgeCY = blockBottom + 28 + bH / 2
  const bX      = -bW / 2
  const bY      = badgeCY - bH / 2

  ctx.strokeStyle = ac
  ctx.lineWidth   = 2
  ctx.globalAlpha = 0.85
  drawRoundRect(ctx, bX, bY, bW, bH, bH / 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.fillStyle   = ac
  ctx.fillText(badgeText, 0, badgeCY)

  ctx.restore()
}

function drawQuote(ctx: CanvasRenderingContext2D, ff: string, quote: string) {
  const text = `"${quote}"`
  ctx.save()
  ctx.font         = `italic 800 56px ${ff}, sans-serif`
  ctx.fillStyle    = WHITE
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  const lines = wrapText(ctx, text, 940)
  const lh    = 56 * 1.28
  const startY = 1330 - ((lines.length - 1) * lh) / 2
  lines.forEach((l, i) => ctx.fillText(l, CX, startY + i * lh))
  ctx.restore()
}

function drawSocialHook(ctx: CanvasRenderingContext2D, ff: string) {
  ctx.save()
  ctx.font         = `500 30px ${ff}, sans-serif`
  ctx.fillStyle    = WHITE
  ctx.globalAlpha  = 0.85
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  const line1 = 'E você, joga como?'
  const line2 = 'Marca teu parceiro de dupla.'
  ctx.fillText(line1, CX, 1508)
  ctx.fillText(line2, CX, 1508 + 30 * 1.35)
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawMinhasArmas(
  ctx: CanvasRenderingContext2D,
  ff: string,
  ac: string,
  names: string[],
) {
  if (!names.length) return

  const Y     = 1622
  const MAX_W = W - 160   // 80px padding each side
  const LABEL = 'Minhas armas: '
  const SEP   = ' · '   // ·

  // Shrink from 34px down to 22px until the full line fits
  let sz = 34
  while (sz > 22) {
    ctx.font = `600 ${sz}px ${ff}, sans-serif`
    if (ctx.measureText(LABEL + names.join(SEP)).width <= MAX_W) break
    sz -= 2
  }

  // If still too wide at min size, truncate the longest name with …
  ctx.font = `600 ${sz}px ${ff}, sans-serif`
  let display = [...names]
  if (ctx.measureText(LABEL + display.join(SEP)).width > MAX_W) {
    let longestIdx = display.reduce((best, n, i) =>
      ctx.measureText(n).width > ctx.measureText(display[best]).width ? i : best, 0)
    let trunc = display[longestIdx]
    while (trunc.length > 2) {
      trunc = trunc.slice(0, -1)
      const trial = [...display]
      trial[longestIdx] = trunc + '…'
      if (ctx.measureText(LABEL + trial.join(SEP)).width <= MAX_W) {
        display = trial
        break
      }
    }
  }

  const labelW  = ctx.measureText(LABEL).width
  const namesStr = display.join(SEP)
  const totalW  = labelW + ctx.measureText(namesStr).width
  const startX  = CX - totalW / 2

  ctx.save()
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${sz}px ${ff}, sans-serif`

  ctx.fillStyle   = ac
  ctx.globalAlpha = 0.90
  ctx.fillText(LABEL, startX, Y)

  ctx.fillStyle   = WHITE
  ctx.globalAlpha = 0.80
  ctx.fillText(namesStr, startX + labelW, Y)

  ctx.globalAlpha = 1
  ctx.restore()
}

function drawFooter(ctx: CanvasRenderingContext2D, ff: string, ac: string) {
  ctx.save()

  // Wordmark: "tu" acento + "raquete" branco
  ctx.font         = `800 50px ${ff}, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'left'
  const tuW = ctx.measureText('tu').width
  const raW = ctx.measureText('raquete').width
  const lgX = CX - (tuW + raW) / 2
  ctx.fillStyle = ac
  ctx.fillText('tu', lgX, 1680)
  ctx.fillStyle = WHITE
  ctx.fillText('raquete', lgX + tuW, 1680)

  // URL
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.font         = `600 36px ${ff}, sans-serif`
  ctx.fillStyle    = WHITE
  ctx.globalAlpha  = 0.88
  ctx.fillText('turaquete.com.br/perfil', CX, 1760)
  ctx.globalAlpha = 1

  ctx.restore()
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function gerarStoryPNG(
  winner: ArquetipoSlug,
  _scores: ScoreMap,
): Promise<Blob> {
  await document.fonts.ready

  const ff   = getDisplayFont()
  const id   = IDENTIDADES[winner]
  const arq  = ARQUETIPOS[winner]
  const pLines = POSTER_LINES[winner]
  const badgeText = `${arq.equivalente} · estilo do tênis pro`

  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const armasNames = (QUIZ_RAQUETES[winner] ?? []).map(c => c.nome_curto).filter(Boolean)

  drawBackground(ctx, id.bg)
  drawJerseyNumber(ctx, ff, id.numero, id.ac)
  drawGrain(ctx, id.ac)
  drawHeader(ctx, ff, id.ac)
  drawNameBlock(ctx, ff, pLines, id.ac, badgeText)
  drawQuote(ctx, ff, id.quote)
  drawSocialHook(ctx, ff)
  drawMinhasArmas(ctx, ff, id.ac, armasNames)
  drawFooter(ctx, ff, id.ac)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))),
      'image/png',
    )
  })
}
