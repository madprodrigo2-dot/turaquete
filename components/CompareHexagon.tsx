import type { RacketWithInsights } from '@/lib/recommend'

const SCORE_KEYS = ['power', 'control', 'comfort', 'maneuverability', 'spin', 'stability'] as const
const LABELS     = ['Potência', 'Controle', 'Conforto', 'Manuseio', 'Spin', 'Estab.']
const COLORS     = { A: '#FF5E3A', B: '#0CC0BE' } as const

const CX = 130, CY = 130, R = 82, LABEL_R = 110, DOT_R = 6
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

  const aPts = aValid >= 4 ? polyPoints(aScores) : ''
  const bPts = bValid >= 4 ? polyPoints(bScores) : ''

  return (
    <div
      className="flex flex-col items-center gap-3 py-1"
      style={{ animation: 'chexPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <style>{`
        @keyframes chexPop {
          from { opacity: 0; transform: scale(0.86); }
          to   { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes chexPop { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>

      <svg
        viewBox="0 0 260 260"
        className="w-full max-w-[260px]"
        overflow="visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="ch-fill-a" cx="50%" cy="50%" r="65%" fx="50%" fy="30%">
            <stop offset="0%"   stopColor={COLORS.A} stopOpacity="0.50" />
            <stop offset="100%" stopColor={COLORS.A} stopOpacity="0.08" />
          </radialGradient>
          <radialGradient id="ch-fill-b" cx="50%" cy="50%" r="65%" fx="50%" fy="30%">
            <stop offset="0%"   stopColor={COLORS.B} stopOpacity="0.50" />
            <stop offset="100%" stopColor={COLORS.B} stopOpacity="0.08" />
          </radialGradient>
          <radialGradient id="ch-bg-a" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={COLORS.A} stopOpacity="0.07" />
            <stop offset="100%" stopColor={COLORS.A} stopOpacity="0"    />
          </radialGradient>
          <radialGradient id="ch-bg-b" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={COLORS.B} stopOpacity="0.07" />
            <stop offset="100%" stopColor={COLORS.B} stopOpacity="0"    />
          </radialGradient>
          <filter id="ch-glow-a" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
          <filter id="ch-glow-b" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
        </defs>

        {bValid >= 4 && <circle cx={CX} cy={CY} r={R * 1.22} fill="url(#ch-bg-b)" />}
        {aValid >= 4 && <circle cx={CX} cy={CY} r={R * 1.22} fill="url(#ch-bg-a)" />}

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
            strokeOpacity={frac === 1 ? 0.14 : 0.07}
            strokeWidth={frac === 1 ? 1 : 0.75}
          />
        ))}

        {/* Axis lines */}
        {ANGLES.map((angle, i) => {
          const [x, y] = pt(angle, R)
          return (
            <line key={i} x1={CX} y1={CY} x2={x} y2={y}
              stroke="#0E3A40" strokeOpacity={0.08} strokeWidth={0.75} />
          )
        })}

        {/* B glow layer */}
        {bValid >= 4 && (
          <polygon points={bPts} fill={COLORS.B} fillOpacity={0.20}
            stroke={COLORS.B} strokeWidth={4} strokeLinejoin="round"
            filter="url(#ch-glow-b)" />
        )}

        {/* A glow layer */}
        {aValid >= 4 && (
          <polygon points={aPts} fill={COLORS.A} fillOpacity={0.20}
            stroke={COLORS.A} strokeWidth={4} strokeLinejoin="round"
            filter="url(#ch-glow-a)" />
        )}

        {/* B polygon */}
        {bValid >= 4 && (
          <polygon points={bPts} fill="url(#ch-fill-b)"
            stroke={COLORS.B} strokeWidth={2} strokeLinejoin="round" />
        )}

        {/* A polygon */}
        {aValid >= 4 && (
          <polygon points={aPts} fill="url(#ch-fill-a)"
            stroke={COLORS.A} strokeWidth={2} strokeLinejoin="round" />
        )}

        {/* B vertex dots */}
        {bValid >= 4 && bScores.map((v, i) => {
          if (v == null || v === 0) return null
          const [x, y] = pt(ANGLES[i], (v / 10) * R)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={DOT_R} fill="white" stroke={COLORS.B} strokeWidth={1.5} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                fontSize={v === 10 ? 6 : 7} fontWeight="800" fill={COLORS.B}>
                {v}
              </text>
            </g>
          )
        })}

        {/* A vertex dots (on top) */}
        {aValid >= 4 && aScores.map((v, i) => {
          if (v == null || v === 0) return null
          const [x, y] = pt(ANGLES[i], (v / 10) * R)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={DOT_R} fill="white" stroke={COLORS.A} strokeWidth={1.5} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                fontSize={v === 10 ? 6 : 7} fontWeight="800" fill={COLORS.A}>
                {v}
              </text>
            </g>
          )
        })}

        {/* Axis labels */}
        {ANGLES.map((angle, i) => {
          const [x, y] = pt(angle, LABEL_R)
          const anchor = x < CX - 8 ? 'end' : x > CX + 8 ? 'start' : 'middle'
          return (
            <text key={i} x={x} y={y}
              textAnchor={anchor} dominantBaseline="middle"
              fontSize={10} fill="#0E3A40" fillOpacity={0.6}>
              {LABELS[i]}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {aValid >= 4 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS.A }} />
            <span className="text-[11px] font-semibold leading-snug" style={{ color: COLORS.A }}>
              {rackets[0].name}
            </span>
          </div>
        )}
        {bValid >= 4 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS.B }} />
            <span className="text-[11px] font-semibold leading-snug" style={{ color: COLORS.B }}>
              {rackets[1].name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
