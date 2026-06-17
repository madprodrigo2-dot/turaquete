import type { RacketWithInsights } from '@/lib/recommend'

const SCORE_KEYS = ['power', 'control', 'comfort', 'maneuverability', 'spin', 'stability'] as const
const LABELS     = ['Potência', 'Controle', 'Conforto', 'Manuseio', 'Spin', 'Estab.']
const COLOR      = '#0CC0BE'

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

interface Props {
  racket: RacketWithInsights
}

export default function RacketHexagon({ racket }: Props) {
  const ins = racket.racket_insights
  const scores = SCORE_KEYS.map(k => (ins ? (ins[k] ?? null) : null))
  const validCount = scores.filter(v => v != null).length

  if (validCount < 4) return null

  return (
    <svg
      viewBox="0 0 240 240"
      className="w-full max-w-[180px] mx-auto block"
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

      {/* Data polygon */}
      <polygon
        points={polyPoints(scores)}
        fill={COLOR}
        fillOpacity={0.18}
        stroke={COLOR}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />

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
            fontSize={9}
            fill="#0E3A40"
            fillOpacity={0.45}
          >
            {LABELS[i]}
          </text>
        )
      })}
    </svg>
  )
}
