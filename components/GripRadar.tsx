const LABELS = ['Aderência', 'Absorção', 'Conforto']
const COLOR = '#0CC0BE'
const CX = 130, CY = 130, R = 82, LABEL_R = 112, DOT_R = 8
const ANGLES = [-90, 30, 150].map(d => (d * Math.PI) / 180)
const RINGS = [0.25, 0.5, 0.75, 1]

function pt(angle: number, r: number): [number, number] {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)]
}

function polyPoints(scores: number[]): string {
  return scores
    .map((v, i) => {
      const [x, y] = pt(ANGLES[i], (v / 10) * R)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

interface Props {
  aderencia: number
  absorcao: number
  conforto: number
}

// Radar de 3 eixos pra grips — irmão mais simples do RacketHexagon (6 eixos,
// scores do motor). Aqui os 3 valores vêm de uma formula documentada (tipo +
// espessura_mm), não de um motor de verdade — por isso sem o selo de "score
// forte"/estrela do hexágono de raquete, que implica comparação com o resto
// do catálogo. O rótulo "Perfil estimado" (no caller) já deixa isso claro.
export default function GripRadar({ aderencia, absorcao, conforto }: Props) {
  const scores = [aderencia, absorcao, conforto]
  const polyPts = polyPoints(scores)

  return (
    <div className="w-full flex justify-center">
      <svg viewBox="0 0 260 260" className="w-full max-w-[220px]" overflow="visible" aria-hidden="true">
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

        <polygon
          points={polyPts}
          fill={COLOR}
          fillOpacity={0.18}
          stroke={COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {scores.map((v, i) => {
          const [x, y] = pt(ANGLES[i], (v / 10) * R)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={DOT_R} fill="white" stroke={COLOR} strokeWidth={1.75} />
              <text
                x={x} y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={8}
                fontWeight="800"
                fill={COLOR}
              >
                {v}
              </text>
            </g>
          )
        })}

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
