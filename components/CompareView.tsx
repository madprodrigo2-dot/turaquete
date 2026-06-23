import Link from 'next/link'
import type { RacketWithInsights } from '@/lib/recommend'
import { buildSpecRows, NIVEL_LABEL } from './SpecsGrid'
import RacketImageTile from './RacketImageTile'
import CompareHexagon from './CompareHexagon'
import { derivarNivel } from '@/lib/nivel'

const SCORES = [
  { key: 'power',           label: 'Potência'     },
  { key: 'control',         label: 'Controle'     },
  { key: 'comfort',         label: 'Conforto'     },
  { key: 'maneuverability', label: 'Manuseio'     },
  { key: 'spin',            label: 'Spin'         },
  { key: 'stability',       label: 'Estabilidade' },
] as const

const COLORS = ['#D85A30', '#5DCAA5'] as const

const SCORE_USE_LABEL: Record<string, string> = {
  power:           'ataque e potência',
  control:         'controle e precisão',
  comfort:         'conforto e proteção do braço',
  maneuverability: 'jogo rápido na rede',
  spin:            'efeitos',
  stability:       'defesa e bloqueios',
}

function computePlacar(
  rackets: RacketWithInsights[],
  spinAjustA: boolean,
  spinAjustB: boolean,
) {
  const ins0 = rackets[0]?.racket_insights
  const ins1 = rackets[1]?.racket_insights
  let winsA = 0, winsB = 0, ties = 0
  for (const { key } of SCORES) {
    // Either racket has adjustable spin → not comparable, count as tie
    if (key === 'spin' && (spinAjustA || spinAjustB)) { ties++; continue }
    const a = ins0 ? (ins0[key] as number | null) : null
    const b = ins1 ? (ins1[key] as number | null) : null
    if (a == null || b == null) continue
    if (a > b) winsA++
    else if (b > a) winsB++
    else ties++
  }
  return { winsA, winsB, ties }
}

function melhorPara(
  a: RacketWithInsights,
  b: RacketWithInsights,
  spinAjustA: boolean,
  spinAjustB: boolean,
): [string[], string[]] {
  const insA = a.racket_insights
  const insB = b.racket_insights
  const winsA: { key: string; margin: number }[] = []
  const winsB: { key: string; margin: number }[] = []
  for (const { key } of SCORES) {
    if (key === 'spin' && (spinAjustA || spinAjustB)) continue
    const va = insA ? (insA[key] as number | null) : null
    const vb = insB ? (insB[key] as number | null) : null
    if (va == null || vb == null) continue
    if (va > vb) winsA.push({ key, margin: va - vb })
    else if (vb > va) winsB.push({ key, margin: vb - va })
  }
  const toLabels = (wins: { key: string; margin: number }[]) =>
    wins
      .sort((x, y) => y.margin - x.margin)
      .slice(0, 2)
      .map(w => SCORE_USE_LABEL[w.key])
      .filter(Boolean)
  return [toLabels(winsA), toLabels(winsB)]
}

function alignedSpecs(rackets: RacketWithInsights[]) {
  const allRows = rackets.map(r => buildSpecRows(r))
  const seen = new Set<string>()
  const labels: string[] = []
  for (const rows of allRows) {
    for (const { label } of rows) {
      if (!seen.has(label)) { seen.add(label); labels.push(label) }
    }
  }
  return labels.map(label => ({
    label,
    values: allRows.map(rows => rows.find(r => r.label === label)?.value ?? null),
  }))
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[10px] font-bold text-tinta/40 uppercase tracking-widest mb-4">{children}</h2>
)

function StarIcon({ color }: { color: string }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 24 24"
      fill={color} aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  )
}

const NEUTRAL_BAR = '#CBD5E1'

function DivergentRow({
  label, valA, valB, colorA, colorB, spinAjustA, spinAjustB,
}: {
  label: string
  valA: number | null
  valB: number | null
  colorA: string
  colorB: string
  spinAjustA: boolean
  spinAjustB: boolean
}) {
  if (valA === null && valB === null && !spinAjustA && !spinAjustB) return null

  const bothAjust  = spinAjustA && spinAjustB
  const eitherAjust = spinAjustA || spinAjustB

  const aWins = !eitherAjust && valA != null && valB != null && valA > valB
  const bWins = !eitherAjust && valA != null && valB != null && valB > valA

  const starA = valA === 10 && !spinAjustA
  const starB = valB === 10 && !spinAjustB

  // Bar widths: always use real value (ajustável shows real height but muted)
  const barPctA = ((valA ?? 0) / 10) * 100
  const barPctB = ((valB ?? 0) / 10) * 100

  // Bar fill: winner = full color, loser = muted, ajustável = neutral
  const barColorA = spinAjustA ? NEUTRAL_BAR : bWins ? `${colorA}55` : colorA
  const barColorB = spinAjustB ? NEUTRAL_BAR : aWins ? `${colorB}55` : colorB

  // Number color/weight: winner bold+color, loser gray, tie medium+color
  const numColorA = spinAjustA || bWins ? '#94a3b8' : colorA
  const numWeightA: number = aWins ? 700 : bWins ? 400 : 500
  const numColorB = spinAjustB || aWins ? '#94a3b8' : colorB
  const numWeightB: number = bWins ? 700 : aWins ? 400 : 500

  const showAjustBadge = spinAjustA || spinAjustB

  return (
    <div>
      {showAjustBadge ? (
        <div className="grid grid-cols-3 items-center mb-2">
          <div className="flex justify-start">
            {spinAjustA && (
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none">
                ajustável
              </span>
            )}
          </div>
          <span className="text-xs text-tinta/50 text-center">{label}</span>
          <div className="flex justify-end">
            {spinAjustB && (
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none">
                ajustável
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center text-xs text-tinta/50 mb-2">{label}</p>
      )}

      <div className="flex items-center" style={{ minHeight: 28 }}>
        {/* Left half: [star?][number] · [bar→center] */}
        <div className="flex items-center gap-2" style={{ width: 'calc(50% - 1px)' }}>
          <div className="flex items-center justify-end gap-1 shrink-0" style={{ width: 42 }}>
            {starA && <StarIcon color={colorA} />}
            <span
              className="text-sm tabular-nums leading-none"
              style={{ color: numColorA, fontWeight: numWeightA }}
            >
              {valA ?? '—'}
            </span>
          </div>
          <div className="flex flex-1 justify-end items-center">
            <div style={{
              width: `${barPctA}%`,
              height: 10,
              background: barColorA,
              borderRadius: '4px 0 0 4px',
            }} />
          </div>
        </div>

        {/* Center divider */}
        <div className="shrink-0" style={{ width: 2, height: 28, background: '#e2e8f0' }} />

        {/* Right half: [center→bar] · [number][star?] */}
        <div className="flex items-center gap-2" style={{ width: 'calc(50% - 1px)' }}>
          <div className="flex flex-1 justify-start items-center">
            <div style={{
              width: `${barPctB}%`,
              height: 10,
              background: barColorB,
              borderRadius: '0 4px 4px 0',
            }} />
          </div>
          <div className="flex items-center gap-1 shrink-0" style={{ width: 42 }}>
            <span
              className="text-sm tabular-nums leading-none"
              style={{ color: numColorB, fontWeight: numWeightB }}
            >
              {valB ?? '—'}
            </span>
            {starB && <StarIcon color={colorB} />}
          </div>
        </div>
      </div>

    </div>
  )
}

interface Props {
  rackets: RacketWithInsights[]
}

export default function CompareView({ rackets }: Props) {
  const specs = alignedSpecs(rackets)
  const hasTwoRackets = rackets.length === 2

  const extraA = (rackets[0]?.specs_extra as Record<string, unknown> | null) ?? {}
  const extraB = (rackets[1]?.specs_extra as Record<string, unknown> | null) ?? {}
  const spinAjustA = extraA.tratamento_fabrica === false
  const spinAjustB = extraB.tratamento_fabrica === false

  const placar = hasTwoRackets ? computePlacar(rackets, spinAjustA, spinAjustB) : null
  const [melA, melB] = hasTwoRackets
    ? melhorPara(rackets[0], rackets[1], spinAjustA, spinAjustB)
    : [[], []]

  return (
    <div className="flex flex-col gap-8">

      {/* Racket headers */}
      <div className="grid grid-cols-2 gap-3">
        {rackets.map((r, i) => {
          const color = COLORS[i]
          const price = r.price != null
            ? `R$ ${r.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
            : null
          const nivel = derivarNivel(r)
          const ins = r.racket_insights
          return (
            <div key={r.id} className="flex flex-col gap-2">
              <div
                className="rounded-xl overflow-hidden"
                style={{ boxShadow: `0 0 0 2px ${color}30`, outline: `3px solid transparent` }}
              >
                <div className="h-1 w-full" style={{ backgroundColor: color }} />
                <RacketImageTile src={r.image_url} alt={r.name} />
              </div>
              <div className="flex flex-col gap-1 px-0.5">
                <Link
                  href={`/raquetes/${r.slug}`}
                  className="text-[12px] font-semibold text-tinta leading-snug hover:underline"
                >
                  {r.name}
                </Link>
                {r.brands?.name && (
                  <span className="text-[11px] text-tinta/40">{r.brands.name}</span>
                )}
                {price && (
                  <span className="text-sm font-bold mt-0.5" style={{ color }}>{price}</span>
                )}
                {r.affiliate_url && (
                  <a
                    href={r.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-[11px] font-medium px-2.5 py-1 rounded-lg w-fit transition-colors"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    Ver na loja →
                  </a>
                )}
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {nivel && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-aqua/12 text-aqua leading-none">
                      {NIVEL_LABEL[nivel] ?? nivel}
                    </span>
                  )}
                  {(ins?.elbow_friendly || ins?.shoulder_friendly) && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 leading-none">
                      Leve nas articulações
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Hexagon radar */}
      {hasTwoRackets && (
        <section className="bg-white rounded-2xl shadow-card border border-[rgba(14,58,64,0.06)] p-5">
          <SectionLabel>Perfil</SectionLabel>
          <CompareHexagon rackets={rackets as [RacketWithInsights, RacketWithInsights]} />
        </section>
      )}

      {/* Placar — scoreboard */}
      {placar && (placar.winsA + placar.winsB + placar.ties) > 0 && (() => {
        const total = placar.winsA + placar.winsB + placar.ties
        const scored = placar.winsA + placar.winsB
        const pctA = scored > 0 ? (placar.winsA / scored) * 100 : 50
        return (
          <section className="bg-white rounded-2xl shadow-card border border-[rgba(14,58,64,0.06)] overflow-hidden">
            <div className="px-5 pt-5 pb-5">
              <SectionLabel>Placar</SectionLabel>
              <div className="flex items-center">
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <span
                    className="text-5xl font-heading font-black tabular-nums leading-none"
                    style={{ color: COLORS[0] }}
                  >
                    {placar.winsA}
                  </span>
                  <span className="text-[11px] text-tinta/50 font-medium text-center leading-tight px-2 break-words max-w-full">
                    {rackets[0]?.name}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 px-4">
                  <span className="text-2xl text-tinta/20 font-light leading-none">×</span>
                  {placar.ties > 0 && (
                    <span className="text-[9px] text-tinta/30 font-medium leading-none">
                      {placar.ties} empt.
                    </span>
                  )}
                </div>
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <span
                    className="text-5xl font-heading font-black tabular-nums leading-none"
                    style={{ color: COLORS[1] }}
                  >
                    {placar.winsB}
                  </span>
                  <span className="text-[11px] text-tinta/50 font-medium text-center leading-tight px-2 break-words max-w-full">
                    {rackets[1]?.name}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-tinta/45 text-center mt-3 leading-snug">
                {placar.winsA > placar.winsB
                  ? <><span className="font-semibold" style={{ color: COLORS[0] }}>{rackets[0]?.name}</span>{` vence em ${placar.winsA} de ${total} atributos`}</>
                  : placar.winsB > placar.winsA
                  ? <><span className="font-semibold" style={{ color: COLORS[1] }}>{rackets[1]?.name}</span>{` vence em ${placar.winsB} de ${total} atributos`}</>
                  : placar.winsA === 0 && placar.winsB === 0
                  ? `Empate técnico em todos os ${total} atributos`
                  : placar.ties > 0
                  ? `Empate técnico — cada uma vence em ${placar.winsA}, empatam em ${placar.ties} de ${total} atributos`
                  : `Empate técnico — cada uma vence em ${placar.winsA} de ${total} atributos`
                }
              </p>
            </div>
            {/* Proportional bar */}
            <div className="flex h-1">
              <div style={{ width: `${pctA}%`, backgroundColor: COLORS[0] }} />
              <div style={{ flex: 1, backgroundColor: COLORS[1] }} />
            </div>
          </section>
        )
      })()}

      {/* Pontuações — divergent bars */}
      <section className="bg-white rounded-2xl shadow-card border border-[rgba(14,58,64,0.06)] p-5">
        <SectionLabel>Pontuações</SectionLabel>

        {/* Legend: A name left, B name right — mirrors bar direction */}
        {hasTwoRackets && (
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[0] }} />
              <span className="text-[11px] font-semibold leading-snug truncate" style={{ color: COLORS[0] }}>
                {rackets[0].name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-semibold leading-snug truncate text-right" style={{ color: COLORS[1] }}>
                {rackets[1].name}
              </span>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[1] }} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {SCORES.map(({ key, label }) => {
            const ins0 = rackets[0]?.racket_insights
            const ins1 = rackets[1]?.racket_insights
            const valA = ins0 ? (ins0[key] as number | null) : null
            const valB = ins1 ? (ins1[key] as number | null) : null
            const isSpinRow = key === 'spin'
            return (
              <DivergentRow
                key={key}
                label={label}
                valA={valA}
                valB={valB}
                colorA={COLORS[0]}
                colorB={COLORS[1]}
                spinAjustA={isSpinRow && spinAjustA}
                spinAjustB={isSpinRow && spinAjustB}
              />
            )
          })}
        </div>
      </section>

      {/* Melhor para */}
      {hasTwoRackets && (melA.length > 0 || melB.length > 0) && (
        <section>
          <SectionLabel>Melhor para</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {rackets.slice(0, 2).map((r, i) => {
              const mel = i === 0 ? melA : melB
              const color = COLORS[i]
              return (
                <div
                  key={r.id}
                  className="rounded-xl border bg-white p-3.5 flex flex-col gap-2.5"
                  style={{ borderColor: `${color}25` }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[11px] font-bold leading-snug" style={{ color }}>{r.name}</span>
                  </div>
                  {mel.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {mel.map((m, j) => (
                        <span
                          key={j}
                          className="text-[10px] font-medium px-2 py-1 rounded-lg leading-snug w-fit"
                          style={{ backgroundColor: `${color}12`, color }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-tinta/30 italic">equilibrada</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Specs */}
      <section>
        <SectionLabel>Especificações</SectionLabel>
        <div className="rounded-xl border border-aqua/20 overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_1fr] bg-gray-50 border-b border-aqua/15">
            <div className="px-3 py-2.5 min-w-[88px]" />
            {rackets.slice(0, 2).map((r, i) => (
              <div key={i} className="px-3 py-2.5 border-l border-aqua/10">
                <span className="text-[10px] font-bold block leading-snug break-words" style={{ color: COLORS[i] }}>
                  {r.name}
                </span>
              </div>
            ))}
          </div>
          {specs.map(({ label, values }, idx) => (
            <div
              key={label}
              className={`grid grid-cols-[auto_1fr_1fr] items-start border-b border-aqua/10 last:border-0 ${
                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
              }`}
            >
              <div className="px-3 py-3 text-tinta/45 text-[11px] font-medium whitespace-nowrap min-w-[88px]">
                {label}
              </div>
              {values.map((v, i) => (
                <div key={i} className="px-3 py-3 text-[12px] text-tinta font-medium border-l border-aqua/10 leading-snug">
                  {v ?? <span className="text-tinta/20">—</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Tury CTA */}
      <div className="rounded-2xl bg-tinta text-white px-5 py-5 flex flex-col gap-3">
        <p className="text-sm font-medium leading-snug">
          Ainda com dúvida? Tury analisa o seu perfil e ajuda a decidir qual é a certa pra você.
        </p>
        <Link
          href="/?chat=1"
          className="bg-aqua text-tinta font-semibold text-sm py-3 px-5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-center block"
        >
          Perguntar à Tury
        </Link>
      </div>

      {/* New comparison */}
      <Link
        href="/comparar"
        className="text-sm text-tinta/50 hover:text-aqua transition-colors text-center block pb-2"
      >
        ← Nova comparação
      </Link>

    </div>
  )
}
