'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics/react'

interface Props {
  racketName: string
  slug: string
}

function postEvent(body: Record<string, unknown>) {
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export default function ShareButton({ racketName, slug }: Props) {
  const [copied, setCopied] = useState(false)

  const url = `https://www.turaquete.com.br/raquetes/${slug}?utm_source=share&utm_medium=web_share`
  const shareText = `A Tury recomendou essa raquete pra mim: ${racketName}`

  async function handleShare() {
    track('share_click', { racket: slug })
    postEvent({ event_type: 'compartilhar_click', racket_slug: slug })

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
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-emerald-500">
            <path d="M2.5 8.5l3.5 3.5 7-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-emerald-600">Copiado</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[#0CC0BE]">
            <path d="M8 1v9M5 4l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 9.5V13a1 1 0 001 1h8a1 1 0 001-1V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span>Compartilhar</span>
        </>
      )}
    </button>
  )
}
