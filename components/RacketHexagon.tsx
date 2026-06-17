import type { RacketWithInsights } from '@/lib/recommend'

const SCORE_KEYS = ['power', 'control', 'comfort', 'maneuverability', 'spin', 'stability'] as const
const LABELS     = ['Potência', 'Controle', 'Conforto', 'Manuseio', 'Spin', 'Estab.']
const COLOR      = '#0CC0BE'

const CX = 130, CY = 130, R = 82, LABEL_R = 110, DOT_R = 8
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

interface Props {
  racket: RacketWithInsights
}

export default function RacketHexagon({ racket }: Props) {
  const ins = racket.racket_insights
  const scores = SCORE_KEYS.map(k => (ins ? (ins[k] ?? null) : null))
  const validCount = scores.filter(v => v != null).length

  if (validCount < 4) return null

  const polyPts = polyPoints(scores)

  return (
    <div
      className="w-full flex justify-center"
      style={{ animation: 'hexPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <style>{`
        @keyframes hexPop {
          from { opacity: 0; transform: scale(0.84); }
          to   { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes hexPop {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
      `}</style>

      <svg
        viewBox="0 0 260 260"
        className="w-full max-w-[240px]"
        overflow="visible"
        aria-hidden="true"
      >
        <defs>
          {/* Gradient fill for the data polygon */}
          <radialGradient id="rh-fill" cx="50%" cy="50%" r="65%" fx="50%" fy="30%">
            <stop offset="0%"   stopColor={COLOR} stopOpacity="0.55" />
            <stop offset="100%" stopColor={COLOR} stopOpacity="0.10" />
          </radialGradient>

          {/* Ambient glow behind the polygon */}
          <radialGradient id="rh-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={COLOR} stopOpacity="0.08" />
            <stop offset="100%" stopColor={COLOR} stopOpacity="0"    />
          </radialGradient>

          {/* Blur filter for the glow layer */}
          <filter id="rh-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
        </defs>

        {/* Ambient background circle */}
        <circle cx={CX} cy={CY} r={R * 1.22} fill="url(#rh-bg)" />

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
            <line
              key={i}
              x1={CX} y1={CY} x2={x} y2={y}
              stroke="#0E3A40" strokeOpacity={0.08} strokeWidth={0.75}
            />
          )
        })}

        {/* Glow layer — blurred clone behind the polygon */}
        <polygon
          points={polyPts}
          fill={COLOR}
          fillOpacity={0.28}
          stroke={COLOR}
          strokeWidth={5}
          strokeLinejoin="round"
          filter="url(#rh-glow)"
        />

        {/* Main data polygon with gradient fill */}
        <polygon
          points={polyPts}
          fill="url(#rh-fill)"
          stroke={COLOR}
          strokeWidth={2.25}
          strokeLinejoin="round"
        />

        {/* Vertex dots with value inside */}
        {scores.map((v, i) => {
          if (v == null || v === 0) return null
          const [x, y] = pt(ANGLES[i], (v / 10) * R)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={DOT_R} fill="white" stroke={COLOR} strokeWidth={1.75} />
              <text
                x={x} y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={v === 10 ? 7 : 8}
                fontWeight="800"
                fill={COLOR}
              >
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
            <text
              key={i}
              x={x} y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={10}
              fill="#0E3A40"
              fillOpacity={0.6}
            >
              {LABELS[i]}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
