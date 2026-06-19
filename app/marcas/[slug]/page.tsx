import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { listarMarcas, listarRaquetasPorMarca, RacketWithInsights } from '@/lib/recommend'
import RacketImageTile from '@/components/RacketImageTile'
import { derivarNivel } from '@/lib/nivel'

// ── Derived brand intro (deterministic, no LLM) ───────────────────────────────

function dominant<T>(arr: (T | null | undefined)[]): T | null {
  const freq = new Map<T, number>()
  for (const v of arr) {
    if (v != null) freq.set(v, (freq.get(v) ?? 0) + 1)
  }
  let best: T | null = null
  let bestCount = 0
  for (const [v, c] of freq) {
    if (c > bestCount) { best = v; bestCount = c }
  }
  return best != null && bestCount / arr.length > 0.5 ? best : null
}

const NIVEL_ORDER = ['iniciante', 'intermediario', 'avancado'] as const
const NIVEL_PT_SINGULAR: Record<string, string> = {
  iniciante: 'iniciante',
  intermediario: 'intermediário',
  avancado: 'avançado',
}
const NIVEL_PT_PLURAL: Record<string, string> = {
  iniciante: 'iniciantes',
  intermediario: 'intermediários',
  avancado: 'jogadores avançados',
}

function buildBrandIntro(brandName: string, rackets: RacketWithInsights[]): string | null {
  const n = rackets.length
  if (n === 0) return null
  const domMaterial = dominant(rackets.map(r => r.face_material?.toLowerCase() ?? null))

  const levels = rackets.map(r => derivarNivel(r)).filter((l): l is 'iniciante' | 'intermediario' | 'avancado' => l != null)
  const uniqueLevels = [...new Set(levels)]
  const sortedLevels = uniqueLevels.sort((a, b) => NIVEL_ORDER.indexOf(a as typeof NIVEL_ORDER[number]) - NIVEL_ORDER.indexOf(b as typeof NIVEL_ORDER[number]))

  let levelClause: string | null = null
  if (sortedLevels.length === 1) {
    levelClause = `voltadas para ${NIVEL_PT_PLURAL[sortedLevels[0]] ?? sortedLevels[0]}`
  } else if (sortedLevels.length >= 2) {
    const min = NIVEL_PT_SINGULAR[sortedLevels[0]] ?? sortedLevels[0]
    const max = NIVEL_PT_SINGULAR[sortedLevels[sortedLevels.length - 1]] ?? sortedLevels[sortedLevels.length - 1]
    levelClause = `do nível ${min} ao ${max}`
  }

  const athletes = [...new Set(
    rackets
      .map(r => (r.specs_extra as Record<string, unknown> | null)?.atleta as string | undefined)
      .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
  )]
  let intro = `A ${brandName} tem ${n} ${n === 1 ? 'raquete' : 'raquetes'} no Turaquete`
  const clauses: string[] = []
  if (domMaterial) clauses.push(`a maioria em ${domMaterial}`)
  if (levelClause) clauses.push(levelClause)
  if (clauses.length > 0) intro += `, ${clauses.join(', ')}`
  if (athletes.length > 0) {
    const names = athletes.slice(0, 3)
    const listed = names.length === 1
      ? names[0]
      : names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1]
    intro += `, com modelos assinados por ${listed}`
  }
  return intro + '.'
}

// ── Score tag (derived from racket_insights scores) ───────────────────────────

const SCORE_TAGS: Record<string, string> = {
  control:         'Ótima pra controle',
  power:           'Pra quem ataca',
  spin:            'Pra quem busca efeito',
  stability:       'Estável e firme',
  maneuverability: 'Leve e ágil',
  comfort:         'Confortável',
  forgiveness:     'Fácil de jogar',
}
const SCORE_PRIORITY = ['control','power','spin','stability','maneuverability','comfort','forgiveness'] as const

function deriveScoreTag(ins: RacketWithInsights['racket_insights']): string | null {
  if (!ins) return null
  type Dim = typeof SCORE_PRIORITY[number]
  const dims = SCORE_PRIORITY.filter((k): k is Dim => ins[k] != null)
  if (dims.length === 0) return null
  const vals = dims.map(k => ins[k] as number)
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  if (max - min <= 1 && max <= 7) return 'Equilibrada'
  const winner = SCORE_PRIORITY.find(k => ins[k] === max)
  return winner ? (SCORE_TAGS[winner] ?? null) : null
}

const BRAND_LOGOS: Record<string, string> = {
  'adidas':     '/brands/adidas-logo.svg',
  'fobel':      '/brands/fobel-logo.png',
  'kona':       '/brands/kona-logo.png',
  'minimalist': '/brands/minimalist-logo.png',
  'mormaii':    '/brands/mormaii-logo.png',
  'nox':        '/brands/nox-logo.png',
  'ocean-air':  '/brands/ocean-air-logo.png',
  'quicksand':  '/brands/quicksand-logo.png',
  'shark':      '/brands/shark-logo.png',
  'total':      '/brands/total-logo.png',
  'vision':     '/brands/vision-logo.png',
  'zeiq':       '/brands/zeiq-logo.png',
  'zand':       '/brands/zand-logo.svg',
}

export async function generateStaticParams() {
  const brands = await listarMarcas().catch(() => [])
  return brands
    .filter(b => b.status === 'disponivel')
    .map(b => ({ slug: b.slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const result = await listarRaquetasPorMarca(slug)
  if (!result) return {}
  const { brand } = result
  const title = `${brand.name} — Raquetes de Beach Tennis | Turaquete`
  const description = `Conheça todas as raquetes ${brand.name} disponíveis. Especificações reais, avaliação e onde comprar cada modelo.`
  return { title, description }
}

// ── Flag SVGs ─────────────────────────────────────────────────────────────────

function FlagItaly() {
  return (
    <svg
      width="24" height="17" viewBox="0 0 3 2"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Itália"
      role="img"
      className="inline-block align-middle rounded-[1px]"
      style={{ boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)', shapeRendering: 'crispEdges' }}
    >
      <rect width="1" height="2" fill="#009246"/>
      <rect x="1" width="1" height="2" fill="#ffffff"/>
      <rect x="2" width="1" height="2" fill="#CE2B37"/>
    </svg>
  )
}

function FlagBrazil() {
  return (
    <svg
      width="24" height="17" viewBox="0 0 20 14"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Brasil"
      role="img"
      className="inline-block align-middle rounded-[1px]"
      style={{ boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)' }}
    >
      <rect width="20" height="14" fill="#009c3b"/>
      <polygon points="10,1.2 18.8,7 10,12.8 1.2,7" fill="#ffdf00"/>
      <circle cx="10" cy="7" r="3.8" fill="#002776"/>
    </svg>
  )
}

function FlagSpain() {
  return (
    <svg
      width="24" height="17" viewBox="0 0 3 2"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Espanha"
      role="img"
      className="inline-block align-middle rounded-[1px]"
      style={{ boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)', shapeRendering: 'crispEdges' }}
    >
      <rect width="3" height="2" fill="#c60b1e"/>
      <rect y="0.5" width="3" height="1" fill="#ffc400"/>
    </svg>
  )
}

function FlagGermany() {
  return (
    <svg
      width="24" height="17" viewBox="0 0 3 2"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Alemanha"
      role="img"
      className="inline-block align-middle rounded-[1px]"
      style={{ boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)', shapeRendering: 'crispEdges' }}
    >
      <rect width="3" height="2" fill="#000000"/>
      <rect y="0.667" width="3" height="0.666" fill="#DD0000"/>
      <rect y="1.333" width="3" height="0.667" fill="#FFCE00"/>
    </svg>
  )
}

function countryName(raw: string): string {
  const c = raw.toLowerCase().trim()
  if (c === 'br' || c === 'brazil') return 'Brasil'
  if (c === 'it' || c === 'italy') return 'Itália'
  if (c === 'es' || c === 'spain') return 'Espanha'
  if (c === 'de' || c === 'germany' || c === 'alemanha' || c === 'deutschland') return 'Alemanha'
  return raw
}

function CountryFlag({ country }: { country: string }) {
  const c = country.toLowerCase().trim()
  if (c === 'itália' || c === 'italia' || c === 'italy' || c === 'it') return <FlagItaly />
  if (c === 'brasil' || c === 'brazil' || c === 'br') return <FlagBrazil />
  if (c === 'espanha' || c === 'spain' || c === 'es') return <FlagSpain />
  if (c === 'alemanha' || c === 'germany' || c === 'de' || c === 'deutschland') return <FlagGermany />
  return null
}

// ── Nivel labels for brand-page cards (shorter than SpecsGrid's NIVEL_LABEL) ──

const NIVEL_CARD: Record<string, { label: string; cls: string }> = {
  iniciante:    { label: 'Iniciante',    cls: 'text-emerald-600 bg-emerald-50' },
  intermediario:{ label: 'Intermediário',cls: 'text-amber-600  bg-amber-50'   },
  avancado:     { label: 'Avançado',     cls: 'text-coral      bg-coral/10'   },
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RacketGridCard({ racket }: { racket: RacketWithInsights }) {
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null
  const ins = racket.racket_insights
  const athlete = (racket.specs_extra as Record<string, unknown> | null)?.atleta as string | undefined
  const scoreTag = deriveScoreTag(ins)
  const nivel = derivarNivel(racket)

  return (
    <Link
      href={`/raquetes/${racket.slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-aqua/20 shadow-sm hover:shadow-md hover:border-aqua/40 transition-all flex flex-col"
    >
      <RacketImageTile src={racket.image_url} alt={racket.name} athlete={athlete} hoverScale />
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-tinta text-xs font-semibold leading-snug line-clamp-2 min-h-[33px]">{racket.name}</p>
        {price && <p className="text-coral font-bold text-sm">{price}</p>}
        {scoreTag && (
          <span className="text-[10px] font-medium text-aqua bg-aqua/10 rounded-full px-2 py-0.5 w-fit leading-tight">
            {scoreTag}
          </span>
        )}
        {nivel && NIVEL_CARD[nivel] && (
          <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 w-fit leading-tight ${NIVEL_CARD[nivel].cls}`}>
            {NIVEL_CARD[nivel].label}
          </span>
        )}
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MarcaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await listarRaquetasPorMarca(slug)
  if (!result) notFound()

  const { brand, rackets } = result
  const logoSrc = brand.logo_url || BRAND_LOGOS[brand.slug] || null
  const brandIntro = buildBrandIntro(brand.name, rackets)

  return (
    <div className="min-h-screen sand-texture">
      {/* Nav */}
      <div className="sticky top-0 z-30 bg-[#FBF6EF]/90 backdrop-blur-sm border-b border-[rgba(14,58,64,0.06)]">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-tinta text-sm font-medium hover:text-aqua transition-colors w-fit"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Início
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 flex flex-col gap-6">

        {/* Header da marca */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            {logoSrc ? (
              <>
                <div className="inline-flex items-center justify-center bg-white rounded-2xl border border-aqua/20 shadow-sm px-5 py-3">
                  <Image
                    src={logoSrc}
                    alt={brand.name}
                    width={180}
                    height={56}
                    className="h-10 md:h-12 w-auto max-w-[180px] object-contain"
                    unoptimized
                  />
                </div>
                <h1 className="sr-only">{brand.name}</h1>
              </>
            ) : (
              <h1 className="text-2xl md:text-3xl font-bold text-tinta">{brand.name}</h1>
            )}
            <p className="text-tinta/60 text-sm">{rackets.length} {rackets.length === 1 ? 'raquete disponível' : 'raquetes disponíveis'}</p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
            {brand.country && (
              <div className="inline-flex items-center gap-1.5 bg-white rounded-xl border border-aqua/20 shadow-sm px-3 py-2">
                <CountryFlag country={brand.country} />
                <span className="text-tinta/60 text-xs font-medium">{countryName(brand.country)}</span>
              </div>
            )}
            <Link
              href="/#marcas"
              className="inline-flex items-center gap-1 text-xs font-medium text-tinta/45 hover:text-aqua transition-colors"
            >
              Ver outras marcas
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                <path d="M2 5.5h7M6 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Intro de marca */}
        {brandIntro && (
          <p className="text-tinta/70 text-sm leading-relaxed -mt-2">{brandIntro}</p>
        )}

        {/* Grid de raquetes */}
        {rackets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {rackets.map(r => (
              <RacketGridCard key={r.id} racket={r} />
            ))}
          </div>
        ) : (
          <p className="text-tinta/50 text-sm">Nenhuma raquete disponível no momento.</p>
        )}

        {/* CTA especialista */}
        <Link
          href="/"
          className="w-full bg-coral text-white font-semibold text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md text-center block"
        >
          Encontrar minha raquete ideal
        </Link>

      </div>
    </div>
  )
}
