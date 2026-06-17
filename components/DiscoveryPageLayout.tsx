import Link from 'next/link'
import type { ReactNode } from 'react'
import { RacketWithInsights } from '@/lib/recommend'
import RacketImageTile from './RacketImageTile'
import { NIVEL_LABEL } from './SpecsGrid'
import { derivarNivel } from '@/lib/nivel'

interface Props {
  icon: ReactNode
  title: string
  subtitle: string
  rackets: RacketWithInsights[]
  emptyMessage?: string
}

function RacketCard({ racket }: { racket: RacketWithInsights }) {
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null
  const athlete = (racket.specs_extra as Record<string, unknown> | null)?.atleta as string | undefined
  const nivel = derivarNivel(racket)

  return (
    <Link
      href={`/raquetes/${racket.slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-card border border-[rgba(14,58,64,0.06)] hover:-translate-y-1 hover:border-aqua/30 transition-all duration-200 flex flex-col"
    >
      <RacketImageTile src={racket.image_url} alt={racket.name} athlete={athlete} hoverScale />
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-tinta text-xs font-semibold leading-snug line-clamp-2 min-h-[33px]">{racket.name}</p>
        {price && <p className="text-coral font-bold text-sm">{price}</p>}
        {nivel && <p className="text-tinta/50 text-xs">{NIVEL_LABEL[nivel] ?? nivel}</p>}
      </div>
    </Link>
  )
}

export default function DiscoveryPageLayout({ icon, title, subtitle, rackets, emptyMessage }: Props) {
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

        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 mb-1">
            {icon}
            <h1 className="text-2xl md:text-3xl font-bold text-tinta">{title}</h1>
          </div>
          <p className="text-tinta/60 text-sm">{subtitle}</p>
          <p className="text-tinta/40 text-xs mt-0.5">
            {rackets.length} {rackets.length === 1 ? 'raquete disponível' : 'raquetes disponíveis'}
          </p>
        </div>

        {/* Grid */}
        {rackets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {rackets.map(r => (
              <RacketCard key={r.id} racket={r} />
            ))}
          </div>
        ) : (
          <p className="text-tinta/50 text-sm">{emptyMessage ?? 'Nenhuma raquete disponível no momento.'}</p>
        )}

        {/* CTA */}
        <Link
          href="/"
          className="w-full bg-coral text-white font-semibold text-base py-4 rounded-2xl hover:opacity-90 hover:shadow-[0_8px_28px_rgba(255,94,58,0.40)] active:scale-[0.98] transition-all shadow-md text-center block"
        >
          Encontrar minha raquete ideal
        </Link>

      </div>
    </div>
  )
}
