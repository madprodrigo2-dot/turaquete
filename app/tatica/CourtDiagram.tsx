'use client'

import type { CourtPlayer, CourtArrow } from './puzzles'

interface Props {
  players: CourtPlayer[]
  ball: { x: number; y: number }
  highlightPlayerIds?: string[]
  arrows?: CourtArrow[]
}

const W = 300
const H = 400
const px = (x: number) => (x / 100) * W
const py = (y: number) => (y / 100) * H

// Tamanho dos personagens (arte real, não mais um círculo) — ~0.4726 de
// proporção largura/altura nos dois PNGs (equipe e rival, medido no arquivo
// fonte). Ancorados pelo PÉ (base), não pelo centro: a coordenada do jogador
// representa "onde ele está pisando", igual um diagrama tático de verdade.
const PLAYER_H = 38
const PLAYER_W = PLAYER_H * 0.4726
const PLAYER_H_HL = 44 // destacado no resultado — um pouco maior, reforça o highlight
const PLAYER_W_HL = PLAYER_H_HL * 0.4726
const BALL_SIZE = 15

// Classifica a(s) flecha(s) do resultado em "jogador(es) se movendo" ou "bola
// voando" sem precisar de nenhum campo novo em puzzles.ts — deriva isso só da
// geometria que já existe. Regras (conferidas contra as 20 táticas hoje):
//  1. Duas flechas + dois destacados: só pode ser a dupla se deslocando junto
//     (nunca duas bolas ao mesmo tempo). Cada flecha liga ao jogador cuja
//     posição de origem bate exatamente com o `from` dela.
//  2. Uma flecha + um destacado: se ela nasce exatamente na posição do jogador
//     E o destino fica do seu próprio lado da quadra (y>=50, rede em y=50), é
//     o jogador se deslocando. Cruzar pro lado do adversário (y<50) só pode
//     ser a bola voando pra lá — um jogador nunca fica de pé no campo do rival
//     (ex.: "variar o saque" e "capitalizar um bom saque" nascem na posição
//     do jogador mas terminam no campo adversário — são o saque/remate, não o
//     jogador correndo pra lá).
//  3. Qualquer outro caso (sem match, ou sem destacado nenhum) é a bola.
function resolveMovement(
  players: CourtPlayer[],
  highlightPlayerIds: string[] | undefined,
  arrows: CourtArrow[] | undefined
): { playerTargets: Record<string, { x: number; y: number }>; shotTarget?: { x: number; y: number } } {
  const playerTargets: Record<string, { x: number; y: number }> = {}
  if (!arrows || arrows.length === 0) return { playerTargets }

  const ids = highlightPlayerIds ?? []

  if (ids.length > 1) {
    for (const arrow of arrows) {
      const player = players.find(p => ids.includes(p.id) && p.x === arrow.from.x && p.y === arrow.from.y)
      if (player) playerTargets[player.id] = arrow.to
    }
    return { playerTargets }
  }

  const arrow = arrows[0]
  const single = ids.length === 1 ? players.find(p => p.id === ids[0]) : undefined
  const startsAtPlayer = !!single && single.x === arrow.from.x && single.y === arrow.from.y
  const staysOnOwnSide = arrow.to.y >= 50

  if (startsAtPlayer && staysOnOwnSide) {
    playerTargets[single!.id] = arrow.to
    return { playerTargets }
  }

  // A bola sempre parte da posição real dela (`ball`, tratada em quem chama),
  // nunca do `from` da flecha — esse `from` às vezes fica ancorado no jogador
  // só por escolha visual de quem desenhou a flecha (ex.: um saque nasce na
  // posição de quem saca, não na posição atual da bola antes do saque).
  return { playerTargets, shotTarget: arrow.to }
}

// Quadra em top-down, rede horizontal em y=50. Coordenadas dos dados são %
// (0–100) e mapeadas direto pro viewBox 0–300 x 0–400. Todo o visual — fundo,
// rede, bola, ponta de flecha, swoosh e os dois personagens (equipe/rival) —
// é arte real (public/tactica/*.webp), sem nada desenhado à mão em SVG além
// das linhas de referência de distância e do traçado da flecha em si (que
// muda de puzzle pra puzzle, não dá pra ser um asset fixo).
export default function CourtDiagram({ players, ball, highlightPlayerIds, arrows }: Props) {
  const allArrows = arrows ?? []
  const { playerTargets, shotTarget } = resolveMovement(players, highlightPlayerIds, arrows)
  const ballPos = shotTarget ?? ball

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Diagrama da quadra">
      <defs>
        <marker
          id="arrowhead-img"
          markerWidth="22" markerHeight="22"
          refX="19" refY="11"
          orient="auto"
          markerUnits="userSpaceOnUse"
          viewBox="0 0 1032 1026"
        >
          <image href="/tactica/punta-flecha.webp" x="0" y="0" width="1032" height="1026" />
        </marker>
      </defs>

      {/* Fundo — imagem real, substitui areia+quadra desenhadas à mão */}
      <image href="/tactica/fondo-cancha.webp" x={0} y={0} width={W} height={H} preserveAspectRatio="none" />

      {/* Rede — imagem real (chroma-key verde removido + spill de croma
          suprimido no cordão da malha). A fita branca do topo do asset fica
          exatamente em y=H/2 (a rede sempre em y=50%); malha e cabo inferior
          pendem abaixo disso. */}
      <image href="/tactica/red.webp" x={16} y={H / 2} width={W - 32} height={(W - 32) / (900 / 171)} preserveAspectRatio="none" />

      {/* Linhas de referência de distância (3m/6m da rede, quadra de 8m por lado)
          — não existem numa quadra de beach tennis de verdade (não tem linha de
          serviço), servem só pra dar noção de escala real às posições dos
          jogadores em vez de só "mais perto/mais longe" relativo. */}
      {[3, 6].flatMap(m => {
        const offsetPct = (m / 8) * 50
        return [50 - offsetPct, 50 + offsetPct].map(yPct => (
          <g key={`ref-${m}-${yPct}`}>
            <line x1={16} y1={py(yPct)} x2={W - 16} y2={py(yPct)} stroke="#0E3A40" strokeOpacity={0.15} strokeWidth={1} strokeDasharray="3 4" />
            <text x={22} y={py(yPct) - 4} fontSize={8} fontWeight={600} fill="#0E3A40" opacity={0.4}>{m}m</text>
          </g>
        ))
      })}

      {/* Bola — desliza pra posição final quando a resposta resolve num "tiro" */}
      <g className="tatica-token" transform={`translate(${px(ballPos.x)}, ${py(ballPos.y)})`}>
        <image href="/tactica/pelota.webp" x={-BALL_SIZE / 2} y={-BALL_SIZE / 2} width={BALL_SIZE} height={BALL_SIZE} />
      </g>

      {/* Jogadores — arte real (equipe/rival), ancorada pelo pé. Desliza pra
          posição final quando a resposta resolve em movimento. */}
      {players.map(p => {
        const isYou = p.team === 'voce'
        const isHighlighted = (highlightPlayerIds ?? []).includes(p.id)
        const target = playerTargets[p.id] ?? { x: p.x, y: p.y }
        const h = isHighlighted ? PLAYER_H_HL : PLAYER_H
        const w = isHighlighted ? PLAYER_W_HL : PLAYER_W
        return (
          <g key={p.id} className="tatica-token" transform={`translate(${px(target.x)}, ${py(target.y)})`}>
            {/* Sombra de contato com a areia — dá uma sensação de "pé no chão" */}
            <ellipse cx={0} cy={2} rx={w * 0.6} ry={w * 0.22} fill="#0E3A40" opacity={0.16} />
            {isHighlighted && (
              <ellipse cx={0} cy={-h * 0.4} rx={w * 0.9} ry={h * 0.55} fill={isYou ? '#0CC0BE' : '#FF5E3A'} fillOpacity={0.18} />
            )}
            <image
              href={isYou ? '/tactica/jugador-equipo.webp' : '/tactica/jugador-rival.webp'}
              x={-w / 2} y={-h}
              width={w} height={h}
            />
            <text
              x={0} y={14}
              textAnchor="middle"
              fontSize={9}
              fontWeight={600}
              fill="#0E3A40"
              opacity={0.65}
            >
              {p.label}
            </text>
          </g>
        )
      })}

      {/* Swoosh no ponto de partida + linha/curva (segue vetor, muda de puzzle
          pra puzzle) + ponta de flecha real no destino — desenhado por cima dos
          tokens (senão o personagem tapa o swoosh quando o tiro nasce em cima
          dele, o caso mais comum). Só aparece no resultado. */}
      {allArrows.length > 0 && (
        <g className="tatica-arrow-in">
          {allArrows.map((a, i) => (
            <image
              key={`swoosh-${i}`}
              href="/tactica/swoosh.webp"
              x={px(a.from.x) - 13} y={py(a.from.y) - 13}
              width={26} height={26}
              opacity={0.85}
            />
          ))}
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
                markerEnd="url(#arrowhead-img)"
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
                markerEnd="url(#arrowhead-img)"
              />
            )
          ))}
        </g>
      )}
    </svg>
  )
}
