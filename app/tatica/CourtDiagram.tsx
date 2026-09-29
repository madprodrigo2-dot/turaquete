'use client'

import { useEffect, useRef, useState } from 'react'
import type { CourtPlayer, CourtArrow, Puzzle } from './puzzles'

type Action = NonNullable<Puzzle['resultado']['action']>

interface Props {
  players: CourtPlayer[]
  ball: { x: number; y: number }
  highlightPlayerIds?: string[]
  arrows?: CourtArrow[]
  action?: Action
}

const W = 300
const H = 400

// A superfície dourada dentro de fondo-cancha.webp não ocupa o canvas
// inteiro — tem margem própria "horneada" na imagem (medido pixel a pixel
// direto no arquivo: cor muda de bege pra dourado em ~15,1%/84,9% no eixo X
// e ~9%/86,3% no eixo Y). px()/py() mapeiam os 0–100% dos dados de cada
// puzzle pra ESSA área real, não pro canvas 0–300/0–400 inteiro — senão
// jogador/bola/rede ficam desalinhados do que a imagem desenha como quadra.
// Se o fundo for regenerado com margem diferente, remedir e ajustar aqui.
const COURT_X0 = 0.151 * W
const COURT_X1 = 0.849 * W
const COURT_Y0 = 0.09 * H
const COURT_Y1 = 0.863 * H
const px = (x: number) => COURT_X0 + (x / 100) * (COURT_X1 - COURT_X0)
const py = (y: number) => COURT_Y0 + (y / 100) * (COURT_Y1 - COURT_Y0)

// Tamanho dos personagens (arte real, não mais um círculo) — ~0.4726 de
// proporção largura/altura nos dois PNGs (equipe e rival, medido no arquivo
// fonte). Ancorados pelo PÉ (base), não pelo centro: a coordenada do jogador
// representa "onde ele está pisando", igual um diagrama tático de verdade.
const PLAYER_H = 38
const PLAYER_W = PLAYER_H * 0.4726
const PLAYER_H_HL = 44 // destacado no resultado — um pouco maior, reforça o highlight
const PLAYER_W_HL = PLAYER_H_HL * 0.4726
const BALL_SIZE = 9
const ANIM_MS = 550

// Poses de ação real (de frente, golpeando) pro jogador destacado no
// resultado — só existem pro time "você" (as 5 artes vieram só na cor
// teal, e nenhuma das 20 táticas destaca um adversário). Cada pose tem sua
// própria proporção (braço/raquete erguidos mudam a silhueta bem mais que
// a pose de espaldas padrão), medida no arquivo fonte de cada uma — por
// isso não reusa PLAYER_W/PLAYER_H_HL, cada action tem seu próprio ratio.
const ACTION_POSES: Record<Action, { href: string; ratio: number }> = {
  voleio: { href: '/tactica/jugador-voleio.webp', ratio: 1579 / 1956 },
  smash: { href: '/tactica/jugador-smash.webp', ratio: 1243 / 2019 },
  saque: { href: '/tactica/jugador-saque.webp', ratio: 1273 / 1928 },
  globo: { href: '/tactica/jugador-globo.webp', ratio: 1639 / 1889 },
  ataque: { href: '/tactica/jugador-ataque.webp', ratio: 1580 / 1533 },
}

// Anima x/y via requestAnimationFrame, não via CSS transition — testado ao
// vivo (Chromium desta sessão): setar `style.transform` com translate()
// sem unidade é CSS inválido e o navegador REJEITA a atribuição em silêncio
// (style.transform fica "", getComputedStyle acusa "none", só o atributo
// serializado mostra o valor — um estado inconsistente que engana até o
// devtools). O atributo `transform` puro do SVG renderiza certo mas o
// transition-property do CSS não anima mudanças nele. RAF com interpolação
// manual não depende de nenhuma das duas ambiguidades — sempre funciona.
function useAnimatedXY(targetX: number, targetY: number): { x: number; y: number } {
  const [pos, setPos] = useState({ x: targetX, y: targetY })
  const fromRef = useRef({ x: targetX, y: targetY })
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    if (from.x === targetX && from.y === targetY) return

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      fromRef.current = { x: targetX, y: targetY }
      setPos({ x: targetX, y: targetY })
      return
    }

    const start = performance.now()
    const startPos = from
    // aproxima o cubic-bezier(0.22, 1, 0.36, 1) que o CSS antigo usava — ease-out forte
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)

    function tick(now: number) {
      const t = Math.min(1, (now - start) / ANIM_MS)
      const e = ease(t)
      setPos({
        x: startPos.x + (targetX - startPos.x) * e,
        y: startPos.y + (targetY - startPos.y) * e,
      })
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = { x: targetX, y: targetY }
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [targetX, targetY])

  return pos
}

function BallToken({ pos }: { pos: { x: number; y: number } }) {
  const { x, y } = useAnimatedXY(px(pos.x), py(pos.y))
  return (
    <g transform={`translate(${x}, ${y})`}>
      <image href="/tactica/pelota.webp" x={-BALL_SIZE / 2} y={-BALL_SIZE / 2} width={BALL_SIZE} height={BALL_SIZE} />
    </g>
  )
}

function PlayerToken({
  player, target, isHighlighted, isYou, action,
}: {
  player: CourtPlayer
  target: { x: number; y: number }
  isHighlighted: boolean
  isYou: boolean
  action?: Action
}) {
  const { x, y } = useAnimatedXY(px(target.x), py(target.y))
  const h = isHighlighted ? PLAYER_H_HL : PLAYER_H
  // pose de ação só existe pro time "você" destacado — qualquer outro caso
  // (não destacado, adversário, ou tática sem action) cai na pose padrão
  // de espaldas, com a proporção fixa de sempre.
  const pose = isHighlighted && isYou && action ? ACTION_POSES[action] : undefined
  const w = pose ? h * pose.ratio : (isHighlighted ? PLAYER_W_HL : PLAYER_W)
  const href = pose ? pose.href : (isYou ? '/tactica/jugador-equipo.webp' : '/tactica/jugador-rival.webp')
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Sombra de contato com a areia — dá uma sensação de "pé no chão" */}
      <ellipse cx={0} cy={2} rx={w * 0.6} ry={w * 0.22} fill="#0E3A40" opacity={0.16} />
      {isHighlighted && (
        <ellipse cx={0} cy={-h * 0.4} rx={w * 0.9} ry={h * 0.55} fill={isYou ? '#0CC0BE' : '#FF5E3A'} fillOpacity={0.18} />
      )}
      <image
        href={href}
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
        {player.label}
      </text>
    </g>
  )
}

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
export default function CourtDiagram({ players, ball, highlightPlayerIds, arrows, action }: Props) {
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

      {/* Fundo — imagem real, substitui areia+quadra desenhadas à mão. TODO:
          fondo-cancha.webp veio com linhas internas de tênis/padel (linha de
          serviço, quadrados) — beach tennis de verdade não tem nada disso,
          só o retângulo de areia com a borda. Pedido pra Rodrigo regenerar
          sem essas marcas; não mexi nisso agora. */}
      <image href="/tactica/fondo-cancha.webp" x={0} y={0} width={W} height={H} preserveAspectRatio="none" />

      {/* Rede — imagem real (chroma-key verde removido + spill de croma
          suprimido no cordão da malha). Altura reduzida bem abaixo da
          proporção nativa (que dava ~51 unidades, 12,75% da altura da
          quadra) — nos dados de puzzles.ts, jogador/flecha perto da rede
          assumem uma linha quase sem espessura; um bloco desse tamanho
          engolia jogador+halo+label inteiros nos puzzles com gente perto do
          net. 16 unidades = mesma altura que os postes desenhados à mão
          tinham antes, restaura o comportamento que os 20 puzzles já
          assumem. Fita branca do topo ancorada exatamente em y=50% (rede). */}
      <image
        href="/tactica/red.webp"
        x={COURT_X0} y={py(50)}
        width={COURT_X1 - COURT_X0} height={16}
        preserveAspectRatio="none"
      />

      {/* Sombra da rede — o asset red.webp termina direto no cabo inferior
          da malha, sem nenhum vão desenhado, e o código também não deixava
          nenhum (testado: só encolher a altura não criava a sensação de vão,
          porque não existe nenhuma "linha de chão" separada nesse diagrama —
          o olho não tem com o que comparar pra perceber que sobrou espaço).
          Uma sombra fina alguns pontos abaixo do cabo, no mesmo estilo da
          sombra de contato dos jogadores (mesma cor/opacidade), marca onde
          o "chão" realmente está — o vão entre o cabo e essa sombra é que
          comunica que a rede de beach tennis fica elevada, sem tocar a
          areia. */}
      <rect
        x={COURT_X0} y={py(50) + 16 + 3}
        width={COURT_X1 - COURT_X0} height={2}
        rx={1}
        fill="#0E3A40" opacity={0.16}
      />

      {/* Linhas de referência de distância (3m/6m da rede, quadra de 8m por lado)
          — não existem numa quadra de beach tennis de verdade (não tem linha de
          serviço), servem só pra dar noção de escala real às posições dos
          jogadores em vez de só "mais perto/mais longe" relativo. */}
      {[3, 6].flatMap(m => {
        const offsetPct = (m / 8) * 50
        return [50 - offsetPct, 50 + offsetPct].map(yPct => (
          <g key={`ref-${m}-${yPct}`}>
            <line x1={COURT_X0} y1={py(yPct)} x2={COURT_X1} y2={py(yPct)} stroke="#0E3A40" strokeOpacity={0.15} strokeWidth={1} strokeDasharray="3 4" />
            <text x={COURT_X0 + 6} y={py(yPct) - 4} fontSize={8} fontWeight={600} fill="#0E3A40" opacity={0.4}>{m}m</text>
          </g>
        ))
      })}

      {/* Bola — desliza pra posição final quando a resposta resolve num "tiro" */}
      <BallToken pos={ballPos} />

      {/* Jogadores — arte real (equipe/rival), ancorada pelo pé. Desliza pra
          posição final quando a resposta resolve em movimento. */}
      {players.map(p => (
        <PlayerToken
          key={p.id}
          player={p}
          target={playerTargets[p.id] ?? { x: p.x, y: p.y }}
          isHighlighted={(highlightPlayerIds ?? []).includes(p.id)}
          isYou={p.team === 'voce'}
          action={action}
        />
      ))}

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
