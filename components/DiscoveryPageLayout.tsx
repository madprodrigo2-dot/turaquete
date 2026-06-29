import Link from 'next/link'
import type { ReactNode } from 'react'
import type { RacketWithInsights } from '@/lib/recommend'
import DiscoveryFilters, { type SortKey } from './DiscoveryFilters'

interface Props {
  icon: ReactNode
  title: string
  subtitle: string
  rackets: RacketWithInsights[]
  emptyMessage?: string
  defaultSort?: SortKey
  showPrecoFilter?: boolean
  showTextSearch?: boolean
  initialQuery?: string
}

export default function DiscoveryPageLayout({
  icon,
  title,
  subtitle,
  rackets,
  emptyMessage,
  defaultSort = 'menor-preco',
  showPrecoFilter = true,
  showTextSearch,
  initialQuery,
}: Props) {
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
        </div>

        {/* Filters + grid — or empty base message */}
        {rackets.length === 0 ? (
          <p className="text-tinta/50 text-sm">{emptyMessage ?? 'Nenhuma raquete disponível no momento.'}</p>
        ) : (
          <DiscoveryFilters
            rackets={rackets}
            defaultSort={defaultSort}
            showPrecoFilter={showPrecoFilter}
            showTextSearch={showTextSearch}
            initialQuery={initialQuery}
            autoFocusSearch={showTextSearch && !initialQuery}
          />
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
