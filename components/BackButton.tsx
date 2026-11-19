'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CaretLeft } from '@phosphor-icons/react'
import { hasPreviousInSite } from '@/lib/navStack'

const cls = 'flex items-center gap-2 text-tinta text-sm font-medium hover:text-aqua transition-colors w-fit'

// Sempre é um <Link> para fallbackHref (funciona sem JS e é rastreável). Ao clicar, se existir uma
// página anterior DO SITE nesta aba (pilha do NavTracker), volta nela com router.back(); senão segue
// para fallbackHref. Nunca usa window.history.length: quem veio do Google voltaria ao Google.
export default function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter()

  return (
    <Link
      href={fallbackHref}
      onClick={(e) => {
        if (hasPreviousInSite()) {
          e.preventDefault()
          router.back()
        }
      }}
      className={cls}
    >
      <CaretLeft size={16} weight="regular" aria-hidden="true" />
      Voltar
    </Link>
  )
}
