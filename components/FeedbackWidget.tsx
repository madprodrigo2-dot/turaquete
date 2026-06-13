'use client'

import { useState } from 'react'
import type { DecisionTrace } from '@/lib/debug-types'

const MOTIVOS = [
  'não entendi as opções',
  'não bate com o que pedi',
  'queria outra coisa',
  'muito caro',
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
  const [state, setState] = useState<'idle' | 'motivo' | 'done'>('idle')

  const base = { session_id: sessionId, intencao, turnos_ate_recomendacao: turnosAteRec }

  const handlePositive = () => {
    fire({ ...base, event_type: 'rating_positive' })
    setState('done')
    setTimeout(onDone, 1200)
  }

  const handleNegative = () => {
    setState('motivo')
  }

  const handleMotivo = (motivo: string) => {
    fire({ ...base, event_type: 'rating_negative', motivo, decision_trace: decisionTrace ?? null })
    setState('done')
    setTimeout(onDone, 1200)
  }

  const handleSkipMotivo = () => {
    fire({ ...base, event_type: 'rating_negative', decision_trace: decisionTrace ?? null })
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

  if (state === 'motivo') {
    return (
      <div className="pl-[68px] flex flex-col gap-2 py-1.5">
        <p className="text-xs text-tinta/50">O que não funcionou?</p>
        <div className="flex flex-wrap gap-1.5">
          {MOTIVOS.map(m => (
            <button
              key={m}
              onClick={() => handleMotivo(m)}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-tinta/60 hover:border-tinta/30 hover:bg-gray-50 active:scale-[0.97] transition-all"
            >
              {m}
            </button>
          ))}
          <button
            onClick={handleSkipMotivo}
            className="text-xs text-tinta/30 hover:text-tinta/50 px-2 py-1.5 transition-colors"
          >
            pular
          </button>
        </div>
      </div>
    )
  }

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
        onClick={handleNegative}
        className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-tinta/60 hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-[0.97] transition-all"
      >
        👎 não era isso
      </button>
      <button onClick={onDone} className="text-xs text-tinta/20 hover:text-tinta/40 transition-colors ml-auto" aria-label="Fechar">✕</button>
    </div>
  )
}
