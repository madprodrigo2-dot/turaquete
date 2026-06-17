import type { RacketWithInsights } from '@/lib/recommend'

const SCORE_KEYS = ['power', 'control', 'comfort', 'maneuverability', 'spin', 'stability'] as const
const LABELS     = ['Potência', 'Controle', 'Conforto', 'Manuseio', 'Spin', 'Estab.']
const COLORS     = { A: '#FF5E3A', B: '#0CC0BE' } as const

const CX = 120, CY = 120, R = 75, LABEL_R = 91
const ANGLES = [-90, -30, 30, 90, 150, 210].map(d => (d * Math.PI) / 180)
const RINGS  = [0.25, 0.5, 0.75, 1]

function pt(angle: number, r: number): [number, number] {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)]
}

function polyPoints(scores: (number | null)[]): string {
  return scores
    .map((v, i) => {
      const [x, y] = pt(ANGLES[i], (v != null ? v / 10 : 0) * R)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function scoreList(r: RacketWithInsights): (number | null)[] {
  const ins = r.racket_insights
  return SCORE_KEYS.map(k => (ins ? (ins[k] ?? null) : null))
}

interface Props {
  rackets: [RacketWithInsights, RacketWithInsights]
}

export default function CompareHexagon({ rackets }: Props) {
  const aScores = scoreList(rackets[0])
  const bScores = scoreList(rackets[1])
  const aValid  = aScores.filter(v => v != null).length
  const bValid  = bScores.filter(v => v != null).length

  if (aValid < 4 && bValid < 4) return null

  return (
    <div className="flex flex-col items-center gap-3 py-1">
      <svg
        viewBox="0 0 240 240"
        className="w-full max-w-[220px]"
        overflow="visible"
        aria-hidden="true"
      >
        {/* Grid rings */}
        {RINGS.map(frac => (
          <polygon
            key={frac}
            points={ANGLES.map(a => {
              const [x, y] = pt(a, frac * R)
              return `${x.toFixed(1)},${y.toFixed(1)}`
            }).join(' ')}
            fill="none"
            stroke="#0E3A40"
            strokeOpacity={frac === 1 ? 0.18 : 0.08}
            strokeWidth={frac === 1 ? 1 : 0.75}
          />
        ))}

        {/* Axis lines */}
        {ANGLES.map((angle, i) => {
          const [x, y] = pt(angle, R)
          return (
            <line
              key={i}
              x1={CX} y1={CY}
              x2={x} y2={y}
              stroke="#0E3A40"
              strokeOpacity={0.1}
              strokeWidth={0.75}
            />
          )
        })}

        {/* B polygon (behind) */}
        {bValid >= 4 && (
          <polygon
            points={polyPoints(bScores)}
            fill={COLORS.B}
            fillOpacity={0.22}
            stroke={COLORS.B}
            strokeWidth={1.75}
            strokeLinejoin="round"
          />
        )}

        {/* A polygon (front) */}
        {aValid >= 4 && (
          <polygon
            points={polyPoints(aScores)}
            fill={COLORS.A}
            fillOpacity={0.22}
            stroke={COLORS.A}
            strokeWidth={1.75}
            strokeLinejoin="round"
          />
        )}

        {/* Labels */}
        {ANGLES.map((angle, i) => {
          const [x, y] = pt(angle, LABEL_R)
          const anchor = x < CX - 8 ? 'end' : x > CX + 8 ? 'start' : 'middle'
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={10}
              fill="#0E3A40"
              fillOpacity={0.45}
            >
              {LABELS[i]}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {aValid >= 4 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.A }} />
            <span className="text-[11px] font-semibold truncate max-w-[110px]" style={{ color: COLORS.A }}>{rackets[0].name}</span>
          </div>
        )}
        {bValid >= 4 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.B }} />
            <span className="text-[11px] font-semibold truncate max-w-[110px]" style={{ color: COLORS.B }}>{rackets[1].name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
