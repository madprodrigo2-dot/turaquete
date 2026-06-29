'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { salvarOverrides, reverterOverride, type DimKey } from './actions'
import type { AdminRacket } from './page'
import type { MotorTrace, MotorTraceDim } from '@/lib/motor'

const DIMS: { key: DimKey; label: string }[] = [
  { key: 'power',          label: 'Potência'     },
  { key: 'control',        label: 'Controle'     },
  { key: 'comfort',        label: 'Conforto'     },
  { key: 'maneuverability',label: 'Manuseio'     },
  { key: 'stability',      label: 'Estabilidade' },
  { key: 'spin',           label: 'Spin'         },
  { key: 'forgiveness',    label: 'Forgiveness'  },
]

function TracePanel({ steps, onClose }: { steps: MotorTraceDim; onClose: () => void }) {
  return (
    <div className="col-span-4 bg-gray-50 border border-gray-100 rounded-lg p-3 text-[11px] font-mono space-y-0.5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-sans font-semibold text-gray-500 uppercase tracking-wider">Cálculo motor</span>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-sm leading-none">✕</button>
      </div>
      {steps.map((s, i) => (
        <div key={i} className={`flex gap-3 ${s.isFinal ? 'border-t border-gray-200 pt-1 mt-1 font-semibold text-gray-800' : 'text-gray-500'}`}>
          <span className="flex-1 truncate">{s.label}</span>
          <span className={`tabular-nums ${s.isBase ? 'text-gray-700' : typeof s.value === 'string' && s.value.startsWith('+') ? 'text-teal-600' : typeof s.value === 'string' && s.value.startsWith('-') ? 'text-red-500' : 'text-gray-700'}`}>
            {s.value}
          </span>
          {s.note && <span className="text-gray-400 italic text-[10px]">{s.note}</span>}
        </div>
      ))}
    </div>
  )
}

export default function BlocoB({ slug, racket, motorTrace }: { slug: string; racket: AdminRacket; motorTrace?: MotorTrace }) {
  const ins = racket.racket_insights
  const motorCache = ins?.motor_cache ?? {}
  const overrides = ins?.overrides ?? {}

  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [revertingDim, startRevertTransition] = useTransition()

  // Local edits: track which dims changed
  type LocalEdit = { [K in DimKey]?: number | '' }
  const [edits, setEdits] = useState<LocalEdit>({})
  const [openTrace, setOpenTrace] = useState<DimKey | null>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function currentValue(dim: DimKey): number | null {
    if (edits[dim] !== undefined) return edits[dim] === '' ? null : Number(edits[dim])
    return (ins?.[dim] as number | null) ?? null
  }

  function hasEdit(dim: DimKey) {
    return edits[dim] !== undefined
  }

  const changedDims = (Object.keys(edits) as DimKey[]).filter(k => edits[k] !== '')

  function handleSave() {
    setError(null)
    setSuccess(false)
    if (changedDims.length === 0) return
    if (!motivo.trim()) { setError('Motivo obrigatório'); return }

    startTransition(async () => {
      try {
        await salvarOverrides(
          slug,
          changedDims.map(dim => ({ dim, value: Number(edits[dim]) })),
          motivo
        )
        setEdits({})
        setMotivo('')
        setSuccess(true)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao salvar')
      }
    })
  }

  function handleRevert(dim: DimKey) {
    setError(null)
    startRevertTransition(async () => {
      try {
        await reverterOverride(slug, dim)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao reverter')
      }
    })
  }

  const scoreGeral = (() => {
    const vals = DIMS.filter(({ key }) => key !== 'spin' && key !== 'comfort' && key !== 'forgiveness').map(({ key }) => (ins?.[key] as number | null) ?? null).filter((v): v is number => v != null)
    if (vals.length === 0) return null
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  })()

  return (
    <section className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          B — Notas
        </span>
        <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
          motor é sempre a referência · override = exceção justificada
        </span>
        {scoreGeral != null && (
          <span className="ml-auto text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full tabular-nums">
            Score geral: {scoreGeral}
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="space-y-2">
          {DIMS.map(({ key, label }) => {
            const motorVal = (motorCache as Record<string, number | null>)[key] ?? null
            const override = (overrides as Record<string, { value: number; motivo: string; por: string; em: string } | null>)[key]
            const activeVal = currentValue(key)
            const traceSteps = motorTrace?.[key as keyof MotorTrace] as MotorTraceDim | undefined

            return (
              <>
              <div key={key} className="grid grid-cols-[120px_60px_80px_1fr] gap-3 items-start py-1">
                {/* Label — clicável para ver trace */}
                <button
                  onClick={() => setOpenTrace(openTrace === key ? null : key)}
                  className={`text-xs text-left pt-1.5 transition-colors ${traceSteps ? 'text-gray-600 hover:text-teal-600 cursor-pointer underline decoration-dotted underline-offset-2' : 'text-gray-600'}`}
                  title={traceSteps ? 'Ver cálculo' : undefined}
                >
                  {label}
                </button>

                {/* Motor reference */}
                <span className="text-xs text-gray-400 pt-1.5 tabular-nums">
                  Motor: <span className="font-medium">{motorVal ?? '—'}</span>
                </span>

                {/* Editable active value */}
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={edits[key] !== undefined ? edits[key] : (activeVal ?? '')}
                  onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className={`text-xs border rounded-lg px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white tabular-nums ${
                    override ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                  } ${hasEdit(key) ? 'border-teal-400 bg-teal-50' : ''}`}
                />

                {/* Status / override info */}
                <div className="text-[10px] pt-1.5 space-y-0.5">
                  {override && !hasEdit(key) ? (
                    <>
                      <span className="text-amber-600 font-medium">● ajuste manual</span>
                      <p className="text-gray-400 leading-tight">&ldquo;{override.motivo}&rdquo;</p>
                      <p className="text-gray-400">
                        {override.por.split('@')[0]} ·{' '}
                        {new Date(override.em).toLocaleDateString('pt-BR')}
                        <button
                          onClick={() => handleRevert(key)}
                          disabled={revertingDim}
                          className="ml-2 text-teal-600 hover:text-teal-700 underline disabled:opacity-50"
                        >
                          ↩ reverter ao motor ({motorVal ?? '—'})
                        </button>
                      </p>
                    </>
                  ) : hasEdit(key) ? (
                    <span className="text-teal-600 font-medium">● editando</span>
                  ) : (
                    <span className="text-gray-300">─ calculado</span>
                  )}
                </div>
              </div>
              {openTrace === key && traceSteps && (
                <TracePanel steps={traceSteps} onClose={() => setOpenTrace(null)} />
              )}
              </>
            )
          })}
        </div>

        {/* Motivo + save */}
        <div className="mt-5 space-y-3 border-t border-gray-50 pt-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Motivo <span className="text-red-400">*</span>{' '}
              <span className="text-gray-400">(obrigatório ao alterar qualquer nota)</span>
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={2}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white resize-none"
              placeholder="ex: spin tech cadastrada justifica valor acima do motor"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && <p className="text-xs text-teal-600">Overrides salvos.</p>}

          <div className="flex justify-between items-center">
            {changedDims.length > 0 && (
              <span className="text-xs text-gray-400">
                {changedDims.length} dim. alterada{changedDims.length > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={pending || changedDims.length === 0}
              className="ml-auto text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {pending ? 'Salvando…' : 'Salvar overrides'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
