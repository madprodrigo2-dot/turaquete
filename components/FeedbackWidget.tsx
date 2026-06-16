'use client'

import { useState } from 'react'
import type { DecisionTrace } from '@/lib/debug-types'

const PREDEFINED_CHIPS = [
  'Caras demais',
  'Não bateu com meu estilo',
  'Queria mais opções',
]

interface Props {
  sessionId: string
  intencao?: string
  turnosAteRec: number
  decisionTrace?: DecisionTrace
  onDone: () => void
}

function fire(body: Record<string, unknown>) {
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export default function FeedbackWidget({ sessionId, intencao, turnosAteRec, decisionTrace, onDone }: Props) {
  const [state, setState] = useState<'idle' | 'negativo' | 'outro' | 'done'>('idle')
  const [texto, setTexto] = useState('')
  const [positivoMsg, setPositivoMsg] = useState(false)

  const base = { session_id: sessionId, intencao, turnos_ate_recomendacao: turnosAteRec }

  const handlePositive = () => {
    fire({ ...base, event_type: 'rating_positive' })
    setPositivoMsg(true)
    setTimeout(onDone, 1400)
  }

  const handleChip = (motivo: string) => {
    fire({
      ...base,
      event_type: 'rating_negative',
      motivo,
      comentario: null,
      decision_trace: decisionTrace ?? null,
    })
    setState('done')
    setTimeout(onDone, 1200)
  }

  const handleOutroSubmit = (skip = false) => {
    fire({
      ...base,
      event_type: 'rating_negative',
      motivo:         'Outro',
      comentario:     skip ? null : (texto.trim() || null),
      decision_trace: decisionTrace ?? null,
    })
    setState('done')
    setTimeout(onDone, 1200)
  }

  if (state === 'done') {
    return (
      <div className="pl-[68px] py-1.5">
        <p className="text-xs text-tinta/40">Obrigado pelo feedback!</p>
      </div>
    )
  }

  if (positivoMsg) {
    return (
      <div className="pl-[68px] py-1.5">
        <p className="text-xs text-tinta/50">Que bom! 🎾</p>
      </div>
    )
  }

  if (state === 'outro') {
    return (
      <div className="pl-[68px] flex flex-col gap-2.5 py-1.5 max-w-sm">
        <p className="text-xs text-tinta/60 leading-relaxed">Me conta o que faltou? (pode ser bem rápido)</p>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Ex: queria algo mais leve, não encontrei da minha marca..."
          rows={2}
          autoFocus
          className="w-full text-xs rounded-lg border border-gray-200 px-3 py-2 text-tinta/70 placeholder-tinta/25 resize-none focus:outline-none focus:border-tinta/30 focus:ring-1 focus:ring-tinta/10 transition-colors"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOutroSubmit(false)}
            className="text-xs font-semibold bg-tinta text-white px-4 py-1.5 rounded-lg hover:bg-tinta/80 active:scale-[0.97] transition-all"
          >
            Enviar
          </button>
          <button
            onClick={() => handleOutroSubmit(true)}
            className="text-xs text-tinta/30 hover:text-tinta/50 transition-colors"
          >
            pular
          </button>
        </div>
      </div>
    )
  }

  if (state === 'negativo') {
    return (
      <div className="pl-[68px] flex flex-col gap-2.5 py-1.5 max-w-sm">
        <p className="text-xs text-tinta/60 leading-relaxed">Poxa, me conta o que faltou? Assim eu melhoro.</p>
        <div className="flex flex-wrap gap-1.5">
          {PREDEFINED_CHIPS.map(c => (
            <button
              key={c}
              onClick={() => handleChip(c)}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-tinta/50 hover:border-tinta/20 hover:bg-gray-50 active:scale-[0.97] transition-all"
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => setState('outro')}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-tinta/50 hover:border-tinta/20 hover:bg-gray-50 active:scale-[0.97] transition-all"
          >
            Outro...
          </button>
        </div>
        <button
          onClick={() => handleChip('(sem motivo)')}
          className="self-start text-xs text-tinta/25 hover:text-tinta/40 transition-colors"
        >
          pular
        </button>
      </div>
    )
  }

  // idle
  return (
    <div className="pl-[68px] flex items-center gap-3 py-1.5">
      <p className="text-xs text-tinta/40 shrink-0">Isso te ajudou?</p>
      <button
        onClick={handlePositive}
        className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-tinta/60 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.97] transition-all"
      >
        👍 me ajudou
      </button>
      <button
        onClick={() => setState('negativo')}
        className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-tinta/60 hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-[0.97] transition-all"
      >
        👎 não era isso
      </button>
      <button onClick={onDone} className="text-xs text-tinta/20 hover:text-tinta/40 transition-colors ml-auto" aria-label="Fechar">✕</button>
    </div>
  )
}
