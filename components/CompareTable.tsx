import { RecommendedRacket } from '@/lib/recommend'

const DIMS = [
  { key: 'power',           label: 'Potência'     },
  { key: 'control',         label: 'Controle'     },
  { key: 'comfort',         label: 'Conforto'     },
  { key: 'maneuverability', label: 'Manuseio'     },
  { key: 'spin',            label: 'Spin'         },
  { key: 'stability',       label: 'Estabilidade' },
] as const

interface Props {
  recommendations: RecommendedRacket[]
}

export default function CompareTable({ recommendations }: Props) {
  const n = recommendations.length
  if (n < 2) return null

  const colsClass = n === 2
    ? 'grid-cols-[auto,1fr,1fr]'
    : 'grid-cols-[auto,1fr,1fr,1fr]'

  return (
    <div className="rounded-xl border border-aqua/20 overflow-hidden bg-white mb-1">

      {/* Header */}
      <div className={`grid ${colsClass} bg-aqua/10`}>
        <div className="px-3 py-2" />
        {recommendations.map(rec => (
          <div key={rec.racket.id} className="px-2 py-2 text-center">
            <p className="text-tinta text-[11px] font-semibold leading-tight line-clamp-2">{rec.racket.name}</p>
          </div>
        ))}
      </div>

      {/* Dimension rows */}
      {DIMS.map((dim, rowIdx) => {
        const ins = recommendations.map(rec =>
          rec.racket.racket_insights as Record<string, number | null | string> | null
        )
        const values = ins.map(i => (i ? (i[dim.key] as number | null) : null))
        const maxVal = Math.max(...values.filter((v): v is number => v != null))
        const hasVariation = values.some(v => v != null && v !== maxVal)

        return (
          <div
            key={dim.key}
            className={`grid ${colsClass} border-t border-gray-100 ${rowIdx % 2 === 0 ? 'bg-gray-50/40' : 'bg-white'}`}
          >
            <div className="px-3 py-2 text-tinta/50 text-[11px] font-medium flex items-center whitespace-nowrap">
              {dim.label}
            </div>
            {values.map((v, ci) => (
              <div key={ci} className="px-2 py-2 flex items-center justify-center">
                {v != null ? (
                  <span className={`text-sm font-bold ${hasVariation && v === maxVal ? 'text-aqua' : 'text-tinta/60'}`}>
                    {v}
                  </span>
                ) : (
                  <span className="text-tinta/20 text-xs">—</span>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
