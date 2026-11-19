'use client'

import Link from 'next/link'
import BackButton from './BackButton'
import SearchBar from './SearchBar'
import { CaretLeft } from '@phosphor-icons/react'

interface Props {
  useHistory?: boolean
  fallbackHref?: string
  fallbackLabel?: string
  backHref?: string
  backLabel?: string
  maxWidth?: string
}

export default function SiteNav({
  useHistory,
  fallbackHref = '/',
  fallbackLabel,
  backHref = '/',
  backLabel = 'Início',
  maxWidth = 'max-w-4xl',
}: Props) {
  return (
    <div className="sticky top-0 z-30 bg-[#FBF6EF]/90 backdrop-blur-sm border-b border-[rgba(14,58,64,0.06)]">
      <div className={`${maxWidth} mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-4`}>
        {useHistory ? (
          <BackButton fallbackHref={fallbackHref} fallbackLabel={fallbackLabel} />
        ) : (
          <Link
            href={backHref}
            className="flex items-center gap-2 text-tinta text-sm font-medium hover:text-aqua transition-colors w-fit shrink-0"
          >
            <CaretLeft size={16} weight="regular" aria-hidden="true" />
            {backLabel}
          </Link>
        )}
        {/* Tagline: deixa claro que o site indica raquetes (não é loja). Mesmo texto em todos os tamanhos
            (~95px). Ocupa o espaço livre entre o botão de voltar e a busca; se faltar espaço (busca
            expandida no mobile) é cortado em silêncio, sem empurrar os vizinhos. aria-hidden: é só reforço
            de marca. O botão de voltar fica curto no mobile (ver BackButton) para sobrar espaço aqui. */}
        <p
          className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-center text-[11px] sm:text-xs text-tinta/55 leading-none"
          aria-hidden="true"
        >
          Indicamos raquetes
        </p>
        <SearchBar />
      </div>
    </div>
  )
}
