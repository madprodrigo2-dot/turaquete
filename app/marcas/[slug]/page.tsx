import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { listarRaquetasPorMarca, RacketWithInsights } from '@/lib/recommend'
import { SITE_URL } from '@/lib/site'
import { derivarNivel } from '@/lib/nivel'
import SiteNav from '@/components/SiteNav'
import MarcaGrid from './MarcaGrid'

export const dynamic = 'force-dynamic'

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

  // Extract athletes: split "A & B" or "A e B", filter out non-name strings (parentheses, >35 chars)
  const rawAthletes = rackets.flatMap(r => {
    const raw = (r.specs_extra as Record<string, unknown> | null)?.atleta
    const strs: string[] = Array.isArray(raw)
      ? (raw as string[]).filter(Boolean)
      : typeof raw === 'string' && raw.trim() ? [raw.trim()] : []
    return strs.flatMap(s =>
      s.split(/\s*[&]\s*|\s+e\s+(?=[A-Z])/).map(p => p.trim()).filter(Boolean)
    )
  })
  const athletes = [...new Set(
    rawAthletes.filter(a => a.length <= 35 && !a.includes('(') && !a.includes('Edição'))
  )]

  // Price range
  const prices = rackets.map(r => r.price).filter((p): p is number => p != null && p > 0)
  const minPrice = prices.length ? Math.min(...prices) : null
  const maxPrice = prices.length ? Math.max(...prices) : null
  const fmtPrice = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

  let intro = `A ${brandName} tem ${n} ${n === 1 ? 'raquete' : 'raquetes'} no Turaquete`
  const clauses: string[] = []
  if (domMaterial) clauses.push(`a maioria em ${domMaterial}`)
  if (levelClause) clauses.push(levelClause)
  if (minPrice != null && maxPrice != null) {
    clauses.push(minPrice === maxPrice ? `a partir de ${fmtPrice(minPrice)}` : `de ${fmtPrice(minPrice)} a ${fmtPrice(maxPrice)}`)
  }
  if (clauses.length > 0) intro += `, ${clauses.join(', ')}`
  if (athletes.length > 0) {
    const MAX = 5
    const shown = athletes.slice(0, MAX)
    const rest  = athletes.length - shown.length
    const listed = shown.length === 1
      ? shown[0]
      : shown.slice(0, -1).join(', ') + ' e ' + shown[shown.length - 1]
    intro += `, com modelos assinados por ${listed}${rest > 0 ? ` e mais ${rest}` : ''}`
  }
  return intro + '.'
}

const BRAND_LOGOS: Record<string, string> = {
  'adidas':     '/brands/adidas-logo.svg',
  'ama-sports': '/brands/ama-sports-logo.webp',
  'drop-shot':  '/brands/drop-shot-logo.png',
  'fobel':      '/brands/fobel-logo.png',
  'head':       '/brands/head-logo.svg',
  'heroes':     '/brands/heroes-logo.webp',
  'kona':       '/brands/kona-logo.png',
  'minimalist': '/brands/minimalist-logo.png',
  'mormaii':    '/brands/mormaii-logo.png',
  'nox':        '/brands/nox-logo.png',
  'ocean-air':  '/brands/ocean-air-logo.png',
  'quicksand':  '/brands/quicksand-logo.png',
  'shark':      '/brands/shark-logo.png',
  'total':      '/brands/total-logo.png',
  'turquoise':  '/brands/turquoise-logo.png',
  'vision':     '/brands/vision-logo.png',
  'zand':       '/brands/zand-logo.svg',
  'zeiq':       '/brands/zeiq-logo.png',
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
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/marcas/${slug}` },
  }
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

function FlagUSA() {
  return (
    <svg
      width="24" height="17" viewBox="0 0 19 10"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Estados Unidos"
      role="img"
      className="inline-block align-middle rounded-[1px]"
      style={{ boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)', shapeRendering: 'crispEdges' }}
    >
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <rect key={i} y={i} width="19" height="1" fill={i % 2 === 0 ? '#B22234' : '#FFFFFF'}/>
      ))}
      <rect width="8" height="5" fill="#3C3B6E"/>
    </svg>
  )
}

function countryName(raw: string): string {
  const c = raw.toLowerCase().trim()
  if (c === 'br' || c === 'brazil' || c === 'brasil') return 'Brasil'
  if (c === 'it' || c === 'italy' || c === 'itália' || c === 'italia') return 'Itália'
  if (c === 'es' || c === 'spain' || c === 'espanha') return 'Espanha'
  if (c === 'de' || c === 'germany' || c === 'alemanha' || c === 'deutschland') return 'Alemanha'
  if (c === 'us' || c === 'usa' || c === 'united states' || c === 'estados unidos') return 'EUA'
  return raw
}

function CountryFlag({ country }: { country: string }) {
  const c = country.toLowerCase().trim()
  if (c === 'itália' || c === 'italia' || c === 'italy' || c === 'it') return <FlagItaly />
  if (c === 'brasil' || c === 'brazil' || c === 'br') return <FlagBrazil />
  if (c === 'espanha' || c === 'spain' || c === 'es') return <FlagSpain />
  if (c === 'alemanha' || c === 'germany' || c === 'de' || c === 'deutschland') return <FlagGermany />
  if (c === 'us' || c === 'usa' || c === 'united states' || c === 'estados unidos') return <FlagUSA />
  return null
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
      <SiteNav maxWidth="max-w-6xl" />

      <div className="max-w-6xl mx-auto px-5 md:px-10 py-8 flex flex-col gap-6">

        {/* Header da marca */}
        <div className="bg-white rounded-2xl border border-aqua/15 shadow-sm px-3 py-2 md:px-5 md:py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          {/* Logo */}
          <div className="shrink-0">
            {logoSrc ? (
              <>
                <div className="inline-flex items-center justify-center bg-white border border-gray-100 rounded-lg px-2 py-1.5 md:px-3.5 md:py-2">
                  <Image
                    src={logoSrc}
                    alt={brand.name}
                    width={200}
                    height={64}
                    className="h-6 md:h-9 w-auto max-w-[110px] md:max-w-[150px] object-contain"
                    unoptimized
                  />
                </div>
                <h1 className="sr-only">{brand.name}</h1>
              </>
            ) : (
              <h1 className="text-base md:text-2xl font-bold text-tinta">{brand.name}</h1>
            )}
          </div>

          {/* Info — descrição + linha de metadados/link, tudo compacto junto */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            {brandIntro && (
              <p className="text-tinta/70 text-[11px] md:text-xs leading-snug">{brandIntro}</p>
            )}
            <div className="flex items-center justify-between gap-x-3 gap-y-1 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-tinta/50 text-[11px]">{rackets.length} {rackets.length === 1 ? 'raquete disponível' : 'raquetes disponíveis'}</span>
              </div>
              <Link
                href="/#marcas"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-tinta/40 hover:text-aqua transition-colors whitespace-nowrap shrink-0"
              >
                Ver outras marcas
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <path d="M2 5.5h7M6 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Grid de raquetes — sort/filtro cliente, reusa padrão de DiscoveryFilters */}
        {rackets.length > 0 ? (
          <MarcaGrid rackets={rackets} />
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
