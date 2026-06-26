'use client'

import { useState } from 'react'
import { RecommendedRacket } from '@/lib/recommend'
import InsightsModal from './InsightsModal'

const DIMS = [
  { key: 'power',           label: 'Potência'     },
  { key: 'control',         label: 'Controle'     },
  { key: 'comfort',         label: 'Conforto'     },
  { key: 'maneuverability', label: 'Manuseio'     },
  { key: 'spin',            label: 'Spin'         },
  { key: 'stability',       label: 'Estabilidade' },
] as const

// coral → aqua → yellow: distinct on white and on dark bg
const COL_COLORS = ['#FF5E3A', '#0CC0BE', '#FFC42E'] as const

function shortName(name: string, modelYear: number | null): string {
  const withYear = modelYear && !name.includes(String(modelYear))
    ? `${name} ${modelYear}`
    : name
  // Max 2 words keeps it scannable in a narrow column
  const words = withYear.split(' ')
  return words.slice(0, 2).join(' ')
}

interface Props {
  recommendations: RecommendedRacket[]
}

export default function CompareTable({ recommendations }: Props) {
  const [openModal, setOpenModal] = useState<number | null>(null) // racket id
  const n = recommendations.length
  if (n < 2) return null

  const colsClass = n === 2
    ? 'grid-cols-[auto,1fr,1fr]'
    : 'grid-cols-[auto,1fr,1fr,1fr]'

  return (
    <>
      <div className="rounded-xl border border-aqua/20 overflow-hidden bg-white mb-1">

        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <div className={`grid ${colsClass} sticky top-0 z-10 bg-tinta`}>
          {/* empty label-column spacer */}
          <div />
          {recommendations.map((rec, ci) => (
            <button
              key={rec.racket.id}
              onClick={() => setOpenModal(rec.racket.id)}
              className="px-1 py-2 flex flex-col items-center gap-1 hover:bg-white/10 active:bg-white/20 transition-colors min-w-0"
              aria-label={`Ver análise: ${rec.racket.name}`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: COL_COLORS[ci] }}
                aria-hidden="true"
              />
              <span className="text-white text-[10px] font-semibold leading-tight text-center w-full truncate px-0.5">
                {shortName(rec.racket.name, rec.racket.model_year)}
              </span>
            </button>
          ))}
        </div>

        {/* ── Dimension rows ─────────────────────────────────────────────── */}
        {DIMS.map((dim, rowIdx) => {
          const values = recommendations.map(rec => {
            const ins = rec.racket.racket_insights as Record<string, number | null> | null
            return ins ? (ins[dim.key] ?? null) : null
          })
          const nonNull = values.filter((v): v is number => v != null)
          const max = nonNull.length > 0 ? Math.max(...nonNull) : null
          // Only highlight when at least one value differs
          const hasVariation = new Set(nonNull).size > 1

          return (
            <div
              key={dim.key}
              className={`grid ${colsClass} border-t border-gray-100 ${rowIdx % 2 === 0 ? 'bg-gray-50/40' : 'bg-white'}`}
            >
              <div className="px-3 py-[5px] text-tinta/50 text-[11px] font-medium flex items-center whitespace-nowrap">
                {dim.label}
              </div>
              {values.map((v, ci) => {
                const isBest = hasVariation && v != null && v === max
                const spinAjust = dim.key === 'spin' &&
                  (recommendations[ci]?.racket.specs_extra as Record<string, unknown> | null)?.tratamento_fabrica === false
                return (
                  <div key={ci} className="py-[5px] flex flex-col items-center justify-center gap-0.5">
                    {v != null ? (
                      <span className={`text-[12px] font-bold tabular-nums leading-none ${isBest ? 'text-aqua' : 'text-tinta/50'}`}>
                        {v}
                      </span>
                    ) : (
                      <span className="text-tinta/20 text-[10px]">—</span>
                    )}
                    {spinAjust && (
                      <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full leading-none">
                        ajust.
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* ── Footer: Peso ───────────────────────────────────────────────── */}
        <div className={`grid ${colsClass} border-t border-aqua/15 bg-aqua/5`}>
          <div className="px-3 py-[5px] text-tinta/40 text-[9px] font-bold uppercase tracking-wider flex items-center whitespace-nowrap">
            Peso
          </div>
          {recommendations.map(rec => (
            <div key={rec.racket.id} className="py-[5px] flex items-center justify-center">
              <span className="text-tinta/60 text-[11px] font-medium tabular-nums">
                {rec.racket.weight_g ? `~${rec.racket.weight_g}g` : ''}
              </span>
            </div>
          ))}
        </div>

        {/* ── Footer: Preço ──────────────────────────────────────────────── */}
        <div className={`grid ${colsClass} border-t border-gray-100`}>
          <div className="px-3 py-[5px] text-tinta/40 text-[9px] font-bold uppercase tracking-wider flex items-center whitespace-nowrap">
            Preço
          </div>
          {recommendations.map(rec => (
            <div key={rec.racket.id} className="py-[5px] flex flex-col items-center gap-0.5">
              {rec.racket.price ? (
                <>
                  <span className="text-coral text-[11px] font-bold tabular-nums leading-none">
                    {`R$${rec.racket.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                  </span>
                  <span className="text-[8px] text-tinta/30 leading-tight text-center">referência</span>
                </>
              ) : (
                <span className="text-tinta/20 text-[10px]">—</span>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* InsightsModal per racket — portal, rendered outside the table */}
      {recommendations.map(rec => (
        <InsightsModal
          key={rec.racket.id}
          racket={rec.racket}
          open={openModal === rec.racket.id}
          onClose={() => setOpenModal(null)}
        />
      ))}
    </>
  )
}
