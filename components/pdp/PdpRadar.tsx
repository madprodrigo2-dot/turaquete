'use client'

import { useId, useState } from 'react'
import type { DimensaoStat } from '@/lib/pdpCopy'

// Telaraña das 6 dimensões do motor (ficha nova). Componente de Rodrigo, adaptado:
//  - dados e descrições vêm de lib/pdpCopy.dimensoesStats() (valores do motor +
//    GLOSSARIO), nada hardcoded aqui;
//  - cores via tokens do tema (aqua, tinta, yellow, gold-deep) em vez de hex;
//  - área de toque maior nos vértices e acessível por teclado.
// Toque/clique (ou mouse por cima) numa ponta destaca o vértice e mostra a
// descrição na barra de baixo. Começa no atributo dominante.

const CX = 180
const CY = 152
const RADIUS = 96

// Semáforo só na cor do número (sempre em negrito, 16px). O coral é reservado ao CTA de compra, por isso
// nenhuma faixa usa coral: 8-10 aqua intenso, 6-7 tinta (teal petróleo),
// 1-5 tinta apagada (opacity 55) para passar a segundo plano sem perder legibilidade.
function semaforo(v: number | null): { cls: string } {
  if (v == null) return { cls: 'fill-tinta' }
  if (v >= 8) return { cls: 'fill-[#088F8D]' }
  if (v <= 5) return { cls: 'fill-tinta/55' }
  return { cls: 'fill-tinta' }
}

export default function PdpRadar({ stats }: { stats: DimensaoStat[] }) {
  const gradId = useId().replace(/:/g, '')
  const total = stats.length
  const vals = stats.map(s => s.value ?? 0)
  const maxVal = Math.max(...vals)
  const defaultIndex = Math.max(0, vals.indexOf(maxVal))
  const [activeIdx, setActiveIdx] = useState<number>(defaultIndex)

  if (stats.filter(s => s.value != null).length < 4) return null

  const getPoint = (index: number, value: number, max = 10) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2
    const r = (value / max) * RADIUS
    return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle), angle }
  }

  const ringPoints = (level: number) =>
    stats.map((_, i) => {
      const { x, y } = getPoint(i, level)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')

  const dataPolygon = stats.map((s, i) => {
    const { x, y } = getPoint(i, s.value ?? 0)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const activeStat = stats[activeIdx]

  // Mobile: o gráfico usa quase toda a largura (menos padding + sangra sobre o padding do
  // cartão pai); com 3 camadas de padding as letras ficavam em ~7px a 375px.
  return (
    <div className="rounded-2xl border border-tinta/10 bg-aqua-light/45 overflow-hidden -mx-3 sm:mx-0">
      <div className="p-2 sm:p-4">
      <svg
        viewBox="3 0 344 305"
        className="w-full max-w-[380px] mx-auto select-none overflow-visible"
        role="group"
        aria-label="Gráfico das 6 características da raquete"
      >
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="55%">
            <stop offset="0%" className="[stop-color:var(--color-aqua)]" stopOpacity="0.08" />
            <stop offset="100%" className="[stop-color:var(--color-aqua)]" stopOpacity="0.30" />
          </radialGradient>
        </defs>

        <polygon points={ringPoints(10)} className="fill-white/65 stroke-tinta/[0.12]" strokeWidth="1" />
        <polygon points={ringPoints(5)} className="fill-none stroke-tinta/10" strokeWidth="1" strokeDasharray="3 3" />

        {stats.map((s, i) => {
          const outer = getPoint(i, 10)
          return (
            <line
              key={s.key}
              x1={CX} y1={CY} x2={outer.x} y2={outer.y}
              className="stroke-tinta/[0.09]"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          )
        })}

        <polygon
          points={dataPolygon}
          fill={`url(#${gradId})`}
          className="stroke-aqua"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {stats.map((s, i) => {
          const v = s.value ?? 0
          const pt = getPoint(i, v)
          const labelPos = getPoint(i, 12.3)
          const isTopStat = s.value != null && v === maxVal
          const isActive = i === activeIdx
          const isGold = v >= 9

          const cos = Math.cos(pt.angle)
          const sin = Math.sin(pt.angle)
          const textAnchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end'
          // Etiqueta em 2 linhas: nome (11px) em cima, nota (16px) embaixo. O bloco fica acima do
          // vértice no topo, abaixo nos vértices de baixo e centrado na vertical nas laterais.
          const NOME_Y = 11
          const NOTA_Y = 17
          const lyNome = labelPos.y + (sin < -0.7 ? -NOTA_Y - 2 : sin > 0.7 ? NOME_Y : -3)
          const lyNota = lyNome + NOTA_Y

          return (
            <g
              key={s.key}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={`${s.label}${s.value != null ? ` ${s.value} de 10` : ''}`}
              onClick={() => setActiveIdx(i)}
              onMouseEnter={() => setActiveIdx(i)}
              onFocus={() => setActiveIdx(i)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveIdx(i) } }}
              className="cursor-pointer outline-none"
            >
              {/* área de toque generosa (≈36px) sem aparecer */}
              <circle cx={pt.x} cy={pt.y} r={18} fill="transparent" />

              {(isActive || isTopStat) && (
                <circle
                  cx={pt.x} cy={pt.y}
                  r={isActive ? 10 : 8}
                  className={isGold ? 'fill-yellow/[0.22]' : 'fill-aqua/[0.22]'}
                />
              )}

              <circle
                cx={pt.x} cy={pt.y}
                r={isActive || isTopStat ? 4.8 : 3.6}
                className={`fill-white ${isGold ? 'stroke-[#D99B00]' : 'stroke-aqua'}`}
                strokeWidth={isActive ? 2.8 : 2.2}
              />

              {/* Duas linhas: o opacity do nome fica no próprio fill (a nota usa a cor do semáforo, sem
                  opacidade extra, para as notas baixas não escurecerem duas vezes). */}
              <text x={labelPos.x} y={lyNome} textAnchor={textAnchor} className="select-none">
                <tspan
                  x={labelPos.x}
                  className={isActive ? 'fill-tinta' : 'fill-tinta/80'}
                  fontSize="11"
                  fontWeight={isActive || isTopStat ? 600 : 500}
                >
                  {s.label}
                </tspan>
                <tspan
                  x={labelPos.x}
                  y={lyNota}
                  className={semaforo(s.value).cls}
                  fontSize="16"
                  fontWeight={700}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {s.value ?? '–'}
                  {isGold && <tspan className="fill-[#D99B00]" fontSize="14" fontWeight={700}>★</tspan>}
                </tspan>
              </text>
            </g>
          )
        })}
      </svg>
      </div>

      {/* Visor da dimensão ativa: faixa escura (alto contraste), rodapé próprio da tarjeta do gráfico */}
      <div className="bg-tinta px-4 py-3 text-white" aria-live="polite">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-aqua">{activeStat.label}</span>
          <span className="rounded bg-aqua/20 px-1.5 py-0.5 text-[11px] font-bold text-aqua">{activeStat.value ?? '–'}/10</span>
        </div>
        <p className="mt-0.5 text-xs text-white/85 leading-snug">{activeStat.desc}</p>
      </div>
    </div>
  )
}
