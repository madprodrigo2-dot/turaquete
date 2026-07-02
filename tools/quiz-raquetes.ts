/**
 * Pre-calculates the top-3 rackets per quiz archetype using the REAL scorer
 * and the REAL buscarRaquetas pipeline — same decisor as Tury.
 *
 * Run: npm run quiz:raquetes
 * Output: lib/quiz-raquetes.ts  (commit the generated file)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const ROOT       = resolve(__dirname, '..')

// Load .env.local BEFORE calling getSupabase() (lazy singleton — safe here)
;(function loadEnv() {
  try {
    const content = readFileSync(resolve(ROOT, '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const k = t.slice(0, eq).trim()
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!(k in process.env)) process.env[k] = v
    }
  } catch { /* .env.local not found — env already set */ }
})()

// ── Import real pipeline (after env is loaded) ────────────────────────────────
import { buscarRaquetas } from '../lib/recommend'
import type { RacketWithInsights } from '../lib/recommend'
import type { ArquetipoSlug } from '../lib/quiz-perfil'

// ── Archetype → profile mapping ───────────────────────────────────────────────
// Maps each archetype to the RacketFilters that best represent its play style.
// muralha/contra-atacante → defensivo/intermediário → prioridade: 'controle'
// canhao/dono-da-rede/finalizador → ataque/intermediário → prioridade: 'potencia'
// camaleao → equilíbrio/intermediário → prioridade: 'equilibrio'

type FilterKey = {
  nivel: 'intermediario'
  prioridade: 'controle' | 'potencia' | 'equilibrio'
}

const PERFIS: Record<ArquetipoSlug, FilterKey> = {
  muralha:           { nivel: 'intermediario', prioridade: 'controle'   },
  'contra-atacante': { nivel: 'intermediario', prioridade: 'controle'   },
  canhao:            { nivel: 'intermediario', prioridade: 'potencia'   },
  'dono-da-rede':    { nivel: 'intermediario', prioridade: 'potencia'   },
  finalizador:       { nivel: 'intermediario', prioridade: 'potencia'   },
  camaleao:          { nivel: 'intermediario', prioridade: 'equilibrio' },
}

const ARQUETIPOS = Object.keys(PERFIS) as ArquetipoSlug[]

// ── Helpers (mirror exact logic from ChatMessage.tsx / RacketCard.tsx) ─────────

// Short display name: strip brand prefix + trailing year (no marca/ano for player card)
function getNomeCurto(r: RacketWithInsights): string {
  const brand = r.brands?.name ?? ''
  let nome = r.name
  if (brand && nome.toLowerCase().startsWith(brand.toLowerCase())) {
    nome = nome.slice(brand.length).trim()
  }
  nome = nome.replace(/\s+\d{4}$/, '').trim()
  return nome || r.name
}

function getDestaques(r: RacketWithInsights) {
  const ins = r.racket_insights
  if (!ins) return []
  return [
    { label: 'Potência',     v: ins.power           },
    { label: 'Controle',     v: ins.control         },
    { label: 'Conforto',     v: ins.comfort         },
    { label: 'Manuseio',     v: ins.maneuverability },
    { label: 'Spin',         v: ins.spin            },
    { label: 'Estabilidade', v: ins.stability       },
    // forgiveness is internal — never shown per RacketCard.tsx
  ]
    .filter((d): d is { label: string; v: number } => d.v != null)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
}

// Exact replica of custoBeneficioBadge() in ChatMessage.tsx
// Returns array of booleans — true = this index gets the badge
function getCustoBeneficio(
  top3: Array<{ match_score: number; racket: { price: number | null; id: number } }>
): boolean[] {
  const scored = top3.filter(r => r.match_score != null && r.racket.price != null && r.racket.price > 0)
  if (scored.length < 2) return top3.map(() => false)
  const prices = scored.map(r => r.racket.price!)
  if (Math.max(...prices) - Math.min(...prices) < 300) return top3.map(() => false)
  const maxScore = Math.max(...scored.map(r => r.match_score))
  if (maxScore <= 0) return top3.map(() => false)
  const nearBest = scored.filter(r => maxScore - r.match_score <= 0.3)
  if (nearBest.length === 0) return top3.map(() => false)
  const cheapest = nearBest.reduce((prev, curr) => curr.racket.price! < prev.racket.price! ? curr : prev)
  return top3.map(r => r.racket.id === cheapest.racket.id)
}

// ── Main ──────────────────────────────────────────────────────────────────────

type RaqueteCard = {
  slug:           string
  name:           string
  nome_curto:     string
  marca:          string
  price:          number | null
  image_url:      string | null
  destaques:      Array<{ label: string; v: number }>
  custoBeneficio: boolean
  score:          number
}

async function main() {
  const OUTPUT: Record<ArquetipoSlug, RaqueteCard[]> = {} as Record<ArquetipoSlug, RaqueteCard[]>

  // De-duplicate runs: same filtros → same result, run once and reuse
  const CACHE = new Map<string, Awaited<ReturnType<typeof buscarRaquetas>>>()

  async function getRanked(filtros: FilterKey) {
    const key = JSON.stringify(filtros)
    if (CACHE.has(key)) return CACHE.get(key)!
    const result = await buscarRaquetas(filtros)
    CACHE.set(key, result)
    return result
  }

  for (const slug of ARQUETIPOS) {
    const filtros = PERFIS[slug]
    const { raquetes } = await getRanked(filtros)

    const top3 = raquetes.slice(0, 3).map(r => ({ racket: r, match_score: r.match_score }))
    const custoBadges = getCustoBeneficio(top3)

    // Validation log
    console.log(`\n── ${slug.toUpperCase()} (${filtros.nivel}/${filtros.prioridade}) ──`)
    top3.forEach((item, i) => {
      const r = item.racket
      const nameDisplay = r.model_year && !r.name.includes(String(r.model_year))
        ? `${r.name} ${r.model_year}`
        : r.name
      const brand = r.brands?.name ?? '?'
      const price = r.price ? `R$${r.price.toLocaleString('pt-BR')}` : 'sem preço'
      const cb    = custoBadges[i] ? ' [custo-beneficio]' : ''
      console.log(`  ${i + 1}. ${nameDisplay} (${brand}) - score: ${item.match_score} - ${price}${cb}`)
      const dest = getDestaques(r)
      if (dest.length) console.log(`     destaques: ${dest.map(d => `${d.label} ${d.v}`).join(', ')}`)
    })

    OUTPUT[slug] = top3.map((item, i) => {
      const r = item.racket
      const nameDisplay = r.model_year && !r.name.includes(String(r.model_year))
        ? `${r.name} ${r.model_year}`
        : r.name
      return {
        slug:           r.slug,
        name:           nameDisplay,
        nome_curto:     getNomeCurto(r),
        marca:          r.brands?.name ?? '',
        price:          r.price,
        image_url:      r.image_url,
        destaques:      getDestaques(r),
        custoBeneficio: custoBadges[i],
        score:          item.match_score,
      }
    })
  }

  // ── Write lib/quiz-raquetes.ts ──────────────────────────────────────────────

  const GENERATED_AT = new Date().toISOString().slice(0, 10)

  const lines: string[] = [
    `// Generated by tools/quiz-raquetes.ts on ${GENERATED_AT}`,
    `// Do NOT edit manually. Re-run: npm run quiz:raquetes`,
    `// Single source of truth: same scorer + pipeline as Tury.`,
    ``,
    `import type { ArquetipoSlug } from './quiz-perfil'`,
    ``,
    `export interface QuizRaqueteCard {`,
    `  slug:           string`,
    `  name:           string`,
    `  nome_curto:     string`,
    `  marca:          string`,
    `  price:          number | null`,
    `  image_url:      string | null`,
    `  destaques:      Array<{ label: string; v: number }>`,
    `  custoBeneficio: boolean`,
    `  score:          number`,
    `}`,
    ``,
    `export const QUIZ_RAQUETES: Record<ArquetipoSlug, QuizRaqueteCard[]> = `,
    JSON.stringify(OUTPUT, null, 2),
    ``,
  ]

  const outPath = resolve(ROOT, 'lib', 'quiz-raquetes.ts')
  writeFileSync(outPath, lines.join('\n'), 'utf-8')
  console.log(`\n ok lib/quiz-raquetes.ts written (${GENERATED_AT})`)
}

main().catch(e => { console.error(e); process.exit(1) })
