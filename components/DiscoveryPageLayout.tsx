import Link from 'next/link'
import type { ReactNode } from 'react'
import type { RacketWithInsights } from '@/lib/recommend'
import DiscoveryFilters, { type SortKey } from './DiscoveryFilters'
import SiteNav from './SiteNav'

interface Props {
  icon?: ReactNode
  imageUrl?: string
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
  imageUrl,
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
      <SiteNav />

      <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 flex flex-col gap-6">

        {/* Header */}
        {imageUrl ? (
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-[#EAF7F6]">
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl md:text-3xl font-bold text-tinta">{title}</h1>
              <p className="text-tinta/60 text-sm line-clamp-2 md:line-clamp-none">{subtitle}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5 mb-1">
              {icon}
              <h1 className="text-2xl md:text-3xl font-bold text-tinta">{title}</h1>
            </div>
            <p className="text-tinta/60 text-sm line-clamp-2 md:line-clamp-none">{subtitle}</p>
          </div>
        )}

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
