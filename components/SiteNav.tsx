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
        {/* Tagline: deixa claro que o site indica raquetes e não é loja. Ocupa o espaço livre entre o
            botão de voltar e a busca; se faltar espaço (botão "Ver mais da {marca}" longo, busca
            expandida no mobile) o texto é cortado em silêncio, sem empurrar os vizinhos. Mobile usa a versão
            curta "Não vendemos" (a completa não cabe ao lado de "Ver mais da {marca}" a 360-375px);
            abaixo de 360px some (aria-hidden: é só reforço de marca, não informação essencial). */}
        <p
          className="hidden min-[360px]:block flex-1 min-w-0 overflow-hidden whitespace-nowrap text-center text-[11px] sm:text-xs text-tinta/55 leading-none"
          aria-hidden="true"
        >
          <span className="sm:hidden">Não vendemos</span>
          <span className="hidden sm:inline">Indicamos raquetes, não vendemos</span>
        </p>
        <SearchBar />
      </div>
    </div>
  )
}
