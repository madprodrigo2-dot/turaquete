'use client'

import type { CourtPlayer, CourtArrow } from './puzzles'

interface Props {
  players: CourtPlayer[]
  ball: { x: number; y: number }
  highlightPlayerIds?: string[]
  arrows?: CourtArrow[]
}

// Quadra em top-down, rede horizontal em y=50. Coordenadas dos dados são %
// (0–100) e mapeadas direto pro viewBox 0–300 x 0–400 (proporção ~3:4, igual
// a uma quadra de beach tennis vista de cima). Mesma paleta do resto do site
// (aqua = você, coral = adversário, tinta = linhas) — sem assets novos.
export default function CourtDiagram({ players, ball, highlightPlayerIds, arrows }: Props) {
  const W = 300
  const H = 400
  const px = (x: number) => (x / 100) * W
  const py = (y: number) => (y / 100) * H
  const allArrows = arrows ?? []

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Diagrama da quadra">
      <defs>
        <radialGradient id="courtSand" cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#FBF6EF" />
          <stop offset="100%" stopColor="#F3E4C8" />
        </radialGradient>
        <radialGradient id="youFill" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#5DDCDA" />
          <stop offset="100%" stopColor="#0CC0BE" />
        </radialGradient>
        <radialGradient id="advFill" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#FF8A69" />
          <stop offset="100%" stopColor="#FF5E3A" />
        </radialGradient>
        <radialGradient id="ballFill" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F3E9D4" />
        </radialGradient>
      </defs>

      {/* Areia de fundo, com "manchas" suaves pra não ficar um bloco de cor chapado */}
      <rect x={0} y={0} width={W} height={H} rx={16} fill="#F7EDDC" />
      <ellipse cx={W * 0.78} cy={H * 0.12} rx={70} ry={34} fill="#AF8041" opacity={0.08} />
      <ellipse cx={W * 0.14} cy={H * 0.28} rx={58} ry={30} fill="#A07338" opacity={0.07} />
      <ellipse cx={W * 0.2} cy={H * 0.82} rx={64} ry={32} fill="#AF8041" opacity={0.08} />
      <ellipse cx={W * 0.82} cy={H * 0.7} rx={56} ry={28} fill="#A07338" opacity={0.06} />

      {/* Quadra */}
      <rect x={16} y={16} width={W - 32} height={H - 32} rx={8} fill="url(#courtSand)" stroke="#0E3A40" strokeOpacity={0.25} strokeWidth={2} />

      {/* Rede, com postes nas duas pontas */}
      <line x1={16} y1={H / 2} x2={W - 16} y2={H / 2} stroke="#0E3A40" strokeWidth={3} strokeDasharray="6 5" strokeLinecap="round" />
      <rect x={13} y={H / 2 - 8} width={5} height={16} rx={2} fill="#0E3A40" opacity={0.55} />
      <rect x={W - 18} y={H / 2 - 8} width={5} height={16} rx={2} fill="#0E3A40" opacity={0.55} />

      {/* Linhas de referência de distância (3m/6m da rede, quadra de 8m por lado)
          — não existem numa quadra de beach tennis de verdade (não tem linha de
          serviço), servem só pra dar noção de escala real às posições dos
          jogadores em vez de só "mais perto/mais longe" relativo. */}
      {[3, 6].flatMap(m => {
        const offsetPct = (m / 8) * 50
        return [50 - offsetPct, 50 + offsetPct].map(yPct => (
          <g key={`ref-${m}-${yPct}`}>
            <line x1={16} y1={py(yPct)} x2={W - 16} y2={py(yPct)} stroke="#0E3A40" strokeOpacity={0.12} strokeWidth={1} strokeDasharray="3 4" />
            <text x={22} y={py(yPct) - 4} fontSize={8} fontWeight={600} fill="#0E3A40" opacity={0.35}>{m}m</text>
          </g>
        ))
      })}

      {/* Setas da jogada correta (só aparecem na tela de resultado) */}
      {allArrows.length > 0 && (
        <g className="tatica-arrow-in">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#FF5E3A" />
            </marker>
          </defs>
          {allArrows.map((a, i) => (
            a.style === 'lob' ? (
              // Ponto de controle deslocado em X (não só em Y) — se from.x === to.x
              // (trajetória vertical, caso mais comum de globo) uma curva quadrática
              // com controle na mesma reta degenera numa linha reta; precisa de um
              // desvio lateral pra desenhar um arco de verdade.
              <path
                key={i}
                d={`M ${px(a.from.x)} ${py(a.from.y)} Q ${px((a.from.x + a.to.x) / 2) + 46} ${(py(a.from.y) + py(a.to.y)) / 2}, ${px(a.to.x)} ${py(a.to.y)}`}
                fill="none"
                stroke="#FF5E3A"
                strokeWidth={3}
                strokeDasharray="2 8"
                strokeLinecap="round"
                markerEnd="url(#arrowhead)"
              />
            ) : (
              <line
                key={i}
                className="tatica-arrow-draw"
                x1={px(a.from.x)} y1={py(a.from.y)}
                x2={px(a.to.x)} y2={py(a.to.y)}
                stroke="#FF5E3A"
                strokeWidth={3}
                strokeLinecap="round"
                markerEnd="url(#arrowhead)"
              />
            )
          ))}
        </g>
      )}

      {/* Bola, com um leve brilho pra não ficar um disco chapado */}
      <circle cx={px(ball.x)} cy={py(ball.y)} r={7} fill="url(#ballFill)" stroke="#0E3A40" strokeWidth={1.5} />
      <path d={`M ${px(ball.x) - 5} ${py(ball.y)} Q ${px(ball.x)} ${py(ball.y) - 6}, ${px(ball.x) + 5} ${py(ball.y)}`} fill="none" stroke="#0E3A40" strokeOpacity={0.35} strokeWidth={1} />

      {/* Jogadores */}
      {players.map(p => {
        const isYou = p.team === 'voce'
        const isHighlighted = (highlightPlayerIds ?? []).includes(p.id)
        const fill = isYou ? 'url(#youFill)' : 'url(#advFill)'
        const r = isHighlighted ? 20 : 17
        return (
          <g key={p.id}>
            {/* Sombra de contato com a areia — dá uma sensação de "pé no chão" */}
            <ellipse cx={px(p.x)} cy={py(p.y) + r * 0.72} rx={r * 0.85} ry={r * 0.26} fill="#0E3A40" opacity={0.14} />
            {isHighlighted && (
              <circle cx={px(p.x)} cy={py(p.y)} r={r + 6} fill={isYou ? '#0CC0BE' : '#FF5E3A'} fillOpacity={0.18} />
            )}
            <circle cx={px(p.x)} cy={py(p.y)} r={r} fill={fill} stroke="#FFFDF8" strokeWidth={2.5} />
            <text
              x={px(p.x)} y={py(p.y) + 4}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="#FFFDF8"
              style={{ fontFamily: 'var(--font-heading, sans-serif)' }}
            >
              {isYou ? (p.label === 'Você' ? 'V' : p.label === 'Parceiro' ? 'P' : p.label[0]) : p.label.replace('Adv. ', 'A')}
            </text>
            <text
              x={px(p.x)} y={py(p.y) + r + 14}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="#0E3A40"
              opacity={0.6}
            >
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
