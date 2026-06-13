'use client'

import { useState } from 'react'
import type { FaixaIdeal } from '@/lib/scorer'

export type DebugData = {
  thinking?: string
  perfilInput?: Record<string, unknown>
  scorerResults?: Array<{
    id: number
    name: string
    score: number
    weight_g: number | null
    elbow_friendly?: boolean | null
    fora_da_faixa?: boolean
  }>
  criteriosRelaxados?: string[]
  diagnostico?: FaixaIdeal | null
  usage?: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    usd: number
    brl: number
  }
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-600 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-1.5 px-2 text-left hover:bg-gray-700 transition-colors"
      >
        <span className="text-gray-300 font-semibold text-[10px] uppercase tracking-wider">{title}</span>
        <span className="text-gray-500 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-2 pb-2">{children}</div>}
    </div>
  )
}

export default function DebugPanel({ data }: { data: DebugData }) {
  return (
    <div className="mt-2 font-mono text-xs bg-gray-800 text-gray-200 rounded-lg overflow-hidden border border-gray-600 select-text">
      <div className="bg-gray-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-yellow-400 font-bold text-[11px]">⚙ DEBUG</span>
        <span className="text-gray-400 text-[10px]">admin only</span>
      </div>

      {data.thinking && (
        <Section title="Thinking" defaultOpen={false}>
          <pre className="text-[11px] text-gray-300 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto">{data.thinking}</pre>
        </Section>
      )}

      {data.perfilInput && (
        <Section title="Perfil extraído">
          <pre className="text-[11px] text-emerald-300 whitespace-pre-wrap">{JSON.stringify(data.perfilInput, null, 2)}</pre>
        </Section>
      )}

      {data.diagnostico && (
        <Section title="Faixa calculada">
          <div className="text-[11px] space-y-0.5">
            <div><span className="text-gray-400">peso: </span><span className="text-cyan-300">{data.diagnostico.peso_min}–{data.diagnostico.peso_max}g</span></div>
            <div><span className="text-gray-400">balance: </span><span className="text-cyan-300">{data.diagnostico.balance_preferido}</span></div>
            {data.diagnostico.prioridades?.length > 0 && (
              <div><span className="text-gray-400">prio: </span><span className="text-cyan-300">{data.diagnostico.prioridades.join(', ')}</span></div>
            )}
          </div>
        </Section>
      )}

      {data.scorerResults && data.scorerResults.length > 0 && (
        <Section title={`Scorer (${data.scorerResults.length})`}>
          <div className="space-y-0.5">
            {data.scorerResults.map(r => (
              <div key={r.id} className="flex items-baseline gap-2 text-[11px]">
                <span className="text-yellow-300 w-10 text-right shrink-0 tabular-nums">{r.score.toFixed(1)}</span>
                <span className={r.fora_da_faixa ? 'text-red-400 line-through' : 'text-gray-200'}>{r.name}</span>
                <span className="text-gray-500 shrink-0">{r.weight_g ?? '?'}g</span>
                {r.elbow_friendly && <span className="text-green-400 text-[9px] shrink-0">elbow✓</span>}
                {r.fora_da_faixa && <span className="text-red-400 text-[9px] shrink-0">fora</span>}
              </div>
            ))}
          </div>
          {data.criteriosRelaxados && data.criteriosRelaxados.length > 0 && (
            <div className="mt-1.5 text-orange-400 text-[10px]">relaxados: {data.criteriosRelaxados.join(', ')}</div>
          )}
        </Section>
      )}

      {data.usage && (
        <Section title="Tokens / custo">
          <div className="text-[11px] space-y-0.5 tabular-nums">
            <div><span className="text-gray-400">input: </span><span className="text-gray-200">{data.usage.input.toLocaleString()}</span></div>
            <div><span className="text-gray-400">output: </span><span className="text-gray-200">{data.usage.output.toLocaleString()}</span></div>
            <div><span className="text-gray-400">cache↑: </span><span className="text-gray-200">{data.usage.cacheWrite.toLocaleString()}</span></div>
            <div><span className="text-gray-400">cache↓: </span><span className="text-gray-200">{data.usage.cacheRead.toLocaleString()}</span></div>
            <div className="mt-1"><span className="text-gray-400">custo: </span><span className="text-green-300">US${data.usage.usd.toFixed(4)} / R${data.usage.brl.toFixed(3)}</span></div>
          </div>
        </Section>
      )}
    </div>
  )
}
