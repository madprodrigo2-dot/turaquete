'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CaretLeft } from '@phosphor-icons/react'
import { hasPreviousInSite, NAV_EVENT } from '@/lib/navStack'

const cls = 'flex items-center gap-2 text-tinta text-sm font-medium hover:text-aqua transition-colors w-fit'

// Sempre é um <Link> para fallbackHref (funciona sem JS e é rastreável). Ao clicar, se existir uma
// página anterior DO SITE nesta aba (pilha do NavTracker), volta nela com router.back(); senão segue
// para fallbackHref. Nunca usa window.history.length: quem veio do Google voltaria ao Google.
//
// Texto: com página anterior do site mostra "Voltar" (não sabemos o que há "atrás"); sem ela (chegada
// de fora) mostra fallbackLabel, que descreve o destino real (ex.: "Ver mais da Nox"). O NavTracker
// avisa por evento quando a pilha está pronta; até lá vale fallbackLabel (é também o texto do HTML
// gerado no servidor, o que vê quem chega do Google).
export default function BackButton({
  fallbackHref,
  fallbackLabel,
}: {
  fallbackHref: string
  fallbackLabel?: string
}) {
  const router = useRouter()
  const [voltaNoSite, setVoltaNoSite] = useState(false)

  useEffect(() => {
    const reavaliar = () => setVoltaNoSite(hasPreviousInSite())
    window.addEventListener(NAV_EVENT, reavaliar)
    return () => window.removeEventListener(NAV_EVENT, reavaliar)
  }, [])

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
      {/* Mobile (<sm): sempre "Voltar" (curto, sobra espaço para a tagline e a busca; marcas longas como
          "Alma Genius" apertavam o cabeçalho). Desktop (sm+): descreve o destino quando vem de fora. */}
      {voltaNoSite || !fallbackLabel ? (
        'Voltar'
      ) : (
        <>
          <span className="sm:hidden">Voltar</span>
          <span className="hidden sm:inline">{fallbackLabel}</span>
        </>
      )}
    </Link>
  )
}
