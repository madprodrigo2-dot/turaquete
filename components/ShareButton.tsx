'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics/react'
import { Check, Export } from '@phosphor-icons/react'

interface Props {
  racketName: string
  slug: string
}

function postEvent(body: Record<string, unknown>) {
  const payload = JSON.stringify(body)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }))
  } else {
    fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }).catch(() => {})
  }
}

export default function ShareButton({ racketName, slug }: Props) {
  const [copied, setCopied] = useState(false)

  const url = `https://www.turaquete.com.br/raquetes/${slug}?utm_source=share&utm_medium=web_share`
  const shareText = `A Tury recomendou essa raquete pra mim: ${racketName}`

  async function handleShare() {
    track('share_click', { racket: slug })
    postEvent({ event_type: 'compartilhar_click', racket_slug: slug, racket_name: racketName })

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: racketName, text: shareText, url })
        return
      } catch (err) {
        // AbortError = usuário fechou o menu — não copiar
        if (err instanceof Error && err.name === 'AbortError') return
        // Qualquer outro erro: fallback pra clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard indisponível (contexto sem permissão) — não faz nada
    }
  }

  return (
    <button
      onClick={handleShare}
      aria-label="Compartilhar raquete"
      className="flex items-center justify-center gap-2 flex-1 border border-gray-200 text-tinta/55 font-medium text-sm py-2.5 px-3.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all"
    >
      {copied ? (
        <>
          <Check size={14} weight="bold" aria-hidden="true" className="shrink-0 text-aqua" />
          <span className="text-aqua">Copiado</span>
        </>
      ) : (
        <>
          <Export size={14} weight="regular" aria-hidden="true" className="shrink-0 text-aqua" />
          <span>Compartilhar</span>
        </>
      )}
    </button>
  )
}
