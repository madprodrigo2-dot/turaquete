'use client'

import { useState } from 'react'

type Origem = 'zero_results' | 'lista'

// Module-level dedup — persists for the duration of the browser session
const sessionSent = new Set<string>()

function sendEvent(termo: string, origem: Origem): boolean {
  const t = termo.trim().toLowerCase().slice(0, 80)
  const key = `${origem}:${t}`
  if (sessionSent.has(key)) return false
  sessionSent.add(key)

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    if (typeof w.gtag === 'function') {
      w.gtag('event', 'busca_sem_resultado', { termo: t, origem })
    }
  } catch {}

  let sid = ''
  try {
    sid = sessionStorage.getItem('nao_achei_sid') ?? ''
    if (!sid) {
      sid = crypto.randomUUID()
      sessionStorage.setItem('nao_achei_sid', sid)
    }
  } catch {
    sid = Math.random().toString(36).slice(2)
  }

  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'busca_sem_resultado',
      session_id: sid,
      motivo: origem,
      comentario: t,
    }),
  }).catch(() => {})
  return true
}

interface Props {
  termoInicial: string
  origem: Origem
  compact?: boolean  // true → dropdown-size styling
}

export default function NaoAcheiWidget({ termoInicial, origem, compact }: Props) {
  const [state, setState] = useState<'idle' | 'open' | 'sent'>('idle')
  const [termo, setTermo] = useState(termoInicial)

  function handleSend() {
    if (termo.trim().length < 2) return
    if (sendEvent(termo, origem)) setState('sent')
  }

  if (state === 'sent') {
    return (
      <p className={`text-tinta/50 ${compact ? 'px-4 py-2.5 text-xs' : 'text-xs mt-2 text-center'}`}>
        Valeu! Vamos atrás dela 🤙
      </p>
    )
  }

  if (state === 'open') {
    return (
      <div className={`flex gap-2 ${compact ? 'px-4 py-2.5 border-t border-tinta/6' : 'mt-2'}`}>
        <input
          type="text"
          value={termo}
          onChange={e => setTermo(e.target.value.slice(0, 80))}
          maxLength={80}
          placeholder="Nome da raquete..."
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
          className="flex-1 text-xs border border-tinta/15 rounded-lg px-2.5 py-1.5 text-tinta placeholder:text-tinta/30 focus:outline-none focus:ring-1 focus:ring-aqua/40 min-w-0"
        />
        <button
          onClick={handleSend}
          disabled={termo.trim().length < 2}
          className="text-xs font-medium px-3 py-1.5 bg-aqua text-white rounded-lg hover:bg-aqua/90 transition-colors disabled:opacity-40 shrink-0"
        >
          Enviar
        </button>
      </div>
    )
  }

  // idle
  if (origem === 'zero_results') {
    return (
      <button
        onClick={() => setState('open')}
        className={`text-xs text-aqua hover:underline font-medium ${compact ? 'px-4 pb-3 pt-1 block' : 'mt-3 block'}`}
      >
        Me avisa qual raquete você procurava
      </button>
    )
  }

  return (
    <p className={`text-xs text-tinta/40 ${compact ? 'px-4 py-2.5 border-t border-tinta/6' : 'mt-5 text-center'}`}>
      Não achou a que procurava?{' '}
      <button
        onClick={() => setState('open')}
        className="text-aqua hover:underline font-medium"
      >
        Conta pra gente
      </button>
    </p>
  )
}
