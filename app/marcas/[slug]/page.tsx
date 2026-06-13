import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { listarMarcas, listarRaquetasPorMarca, RacketWithInsights } from '@/lib/recommend'
import AthleteBadge from '@/components/AthleteBadge'
import { NIVEL_LABEL } from '@/components/SpecsGrid'

export const dynamicParams = false

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
  const description = `Conheça todas as raquetes ${brand.name} disponíveis. Specs, avaliação e onde comprar cada modelo.`
  return { title, description }
}

// ── Flag SVGs ─────────────────────────────────────────────────────────────────

function FlagItaly() {
  return (
    <svg
      width="20" height="14" viewBox="0 0 3 2"
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
      width="20" height="14" viewBox="0 0 20 14"
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

function CountryFlag({ country }: { country: string }) {
  const c = country.toLowerCase()
  if (c === 'itália' || c === 'italia' || c === 'italy') return <FlagItaly />
  if (c === 'brasil' || c === 'brazil' || c === 'br') return <FlagBrazil />
  return null
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RacketGridCard({ racket }: { racket: RacketWithInsights }) {
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null
  const ins = racket.racket_insights
  const athlete = (racket.specs_extra as Record<string, unknown> | null)?.atleta as string | undefined

  return (
    <Link
      href={`/raquetes/${racket.slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-aqua/20 shadow-sm hover:shadow-md hover:border-aqua/40 transition-all flex flex-col"
    >
      {racket.image_url ? (
        <div className="relative aspect-[4/5] bg-white p-3 flex items-center justify-center overflow-hidden">
          {athlete && (
            <div className="absolute top-1.5 left-1.5 z-10">
              <AthleteBadge athlete={athlete} />
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={racket.image_url}
            alt={racket.name}
            className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-square bg-aqua-light flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <ellipse cx="12" cy="9.5" rx="6" ry="7.5" fill="#0CC0BE" />
            <rect x="10.5" y="16" width="3" height="7" rx="1.5" fill="#0CC0BE" />
          </svg>
        </div>
      )}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-tinta text-xs font-semibold leading-snug line-clamp-2">{racket.name}</p>
        {price && <p className="text-coral font-bold text-sm">{price}</p>}
        {ins?.nivel_sugerido && (
          <p className="text-tinta/50 text-xs">{NIVEL_LABEL[ins.nivel_sugerido] ?? ins.nivel_sugerido}</p>
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

  return (
    <div className="min-h-screen bg-aqua-light">
      {/* Nav */}
      <div className="sticky top-0 z-10 bg-aqua-light/90 backdrop-blur-sm border-b border-aqua/20 px-5 py-3">
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

      <div className="max-w-2xl mx-auto px-5 py-8 flex flex-col gap-6">

        {/* Header da marca */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-bold text-tinta">{brand.name}</h1>
          {brand.country && (
            <p className="text-tinta/50 text-sm flex items-center gap-1.5">
              <CountryFlag country={brand.country} />
              <span>{brand.country}</span>
            </p>
          )}
          <p className="text-tinta/60 text-sm">{rackets.length} {rackets.length === 1 ? 'raquete disponível' : 'raquetes disponíveis'}</p>
        </div>

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
