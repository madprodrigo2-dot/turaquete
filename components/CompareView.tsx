import Link from 'next/link'
import type { RacketWithInsights } from '@/lib/recommend'
import { buildSpecRows, NIVEL_LABEL } from './SpecsGrid'
import RacketImageTile from './RacketImageTile'
import CompareHexagon from './CompareHexagon'
import ScoreBar from './ScoreBar'
import { derivarNivel } from '@/lib/nivel'

const SCORES = [
  { key: 'power',           label: 'Potência'     },
  { key: 'control',         label: 'Controle'     },
  { key: 'comfort',         label: 'Conforto'     },
  { key: 'maneuverability', label: 'Manuseio'     },
  { key: 'spin',            label: 'Spin'         },
  { key: 'stability',       label: 'Estabilidade' },
] as const

const COLORS = ['#FF5E3A', '#0CC0BE'] as const

const SCORE_USE_LABEL: Record<string, string> = {
  power:           'ataque e potência',
  control:         'controle e precisão',
  comfort:         'conforto e proteção do braço',
  maneuverability: 'jogo rápido na rede',
  spin:            'efeitos',
  stability:       'defesa e bloqueios',
}

function computePlacar(rackets: RacketWithInsights[]) {
  const ins0 = rackets[0]?.racket_insights
  const ins1 = rackets[1]?.racket_insights
  let winsA = 0, winsB = 0, ties = 0
  for (const { key } of SCORES) {
    const a = ins0 ? (ins0[key] as number | null) : null
    const b = ins1 ? (ins1[key] as number | null) : null
    if (a == null || b == null) continue
    if (a > b) winsA++
    else if (b > a) winsB++
    else ties++
  }
  return { winsA, winsB, ties }
}

function melhorPara(a: RacketWithInsights, b: RacketWithInsights): [string[], string[]] {
  const insA = a.racket_insights
  const insB = b.racket_insights
  const winsA: { key: string; margin: number }[] = []
  const winsB: { key: string; margin: number }[] = []
  for (const { key } of SCORES) {
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

interface Props {
  rackets: RacketWithInsights[]
}

export default function CompareView({ rackets }: Props) {
  const specs = alignedSpecs(rackets)
  const hasTwoRackets = rackets.length === 2
  const placar = hasTwoRackets ? computePlacar(rackets) : null
  const [melA, melB] = hasTwoRackets
    ? melhorPara(rackets[0], rackets[1])
    : [[], []]

  return (
    <div className="flex flex-col gap-7">

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
            <div key={r.id} className="flex flex-col gap-1.5">
              <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: `${color}35` }}>
                <RacketImageTile src={r.image_url} alt={r.name} />
              </div>
              <div className="flex flex-col gap-0.5">
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
                  <span className="text-sm font-bold" style={{ color }}>{price}</span>
                )}
                {r.affiliate_url && (
                  <a
                    href={r.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-aqua hover:underline mt-0.5"
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
                      Articulação em dia
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
        <section className="bg-white/60 rounded-2xl p-4">
          <h2 className="text-xs font-bold text-tinta/40 uppercase tracking-wider mb-3">Perfil</h2>
          <CompareHexagon rackets={rackets as [RacketWithInsights, RacketWithInsights]} />
        </section>
      )}

      {/* Placar */}
      {placar && (placar.winsA + placar.winsB + placar.ties) > 0 && (
        <section className="bg-white/60 rounded-2xl p-4">
          <h2 className="text-xs font-bold text-tinta/40 uppercase tracking-wider mb-3">Placar</h2>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: COLORS[0] }}>
              {placar.winsA}
            </span>
            <span className="text-tinta/30 text-base font-medium">×</span>
            <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: COLORS[1] }}>
              {placar.winsB}
            </span>
            {placar.ties > 0 && (
              <span className="text-[11px] text-tinta/40 ml-1">
                ({placar.ties} empate{placar.ties > 1 ? 's' : ''})
              </span>
            )}
          </div>
          <p className="text-[12px] text-tinta/60 mt-1.5">
            {placar.winsA > placar.winsB ? (
              <>
                <span className="font-semibold" style={{ color: COLORS[0] }}>{rackets[0]?.name}</span>
                {` vence em ${placar.winsA} de ${placar.winsA + placar.winsB + placar.ties} quesitos`}
              </>
            ) : placar.winsB > placar.winsA ? (
              <>
                <span className="font-semibold" style={{ color: COLORS[1] }}>{rackets[1]?.name}</span>
                {` vence em ${placar.winsB} de ${placar.winsA + placar.winsB + placar.ties} quesitos`}
              </>
            ) : (
              `Empate técnico em ${placar.winsA + placar.winsB + placar.ties} quesitos`
            )}
          </p>
        </section>
      )}

      {/* Scores */}
      <section>
        <h2 className="text-xs font-bold text-tinta/40 uppercase tracking-wider mb-3">Pontuações</h2>
        {hasTwoRackets && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: COLORS[0] }} />
              <span className="text-[11px] font-semibold truncate max-w-[130px]" style={{ color: COLORS[0] }}>{rackets[0].name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: COLORS[1] }} />
              <span className="text-[11px] font-semibold truncate max-w-[130px]" style={{ color: COLORS[1] }}>{rackets[1].name}</span>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-4">
          {SCORES.map(({ key, label }) => {
            const ins0 = rackets[0]?.racket_insights
            const ins1 = rackets[1]?.racket_insights
            const valA = ins0 ? (ins0[key] as number | null) : null
            const valB = ins1 ? (ins1[key] as number | null) : null
            if (valA === null && valB === null) return null
            const diff = valA != null && valB != null ? valA - valB : null
            return (
              <div key={key} className="flex items-start gap-3">
                <div className="w-28 shrink-0 pt-0.5">
                  <span className="text-tinta/70 text-sm">{label}</span>
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <ScoreBar
                    value={valA}
                    color={COLORS[0]}
                    badge={diff != null && diff > 0 ? `+${diff}` : undefined}
                  />
                  <ScoreBar
                    value={valB}
                    color={COLORS[1]}
                    badge={diff != null && diff < 0 ? `+${-diff}` : undefined}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Melhor para */}
      {hasTwoRackets && (melA.length > 0 || melB.length > 0) && (
        <section>
          <h2 className="text-xs font-bold text-tinta/40 uppercase tracking-wider mb-3">Melhor para</h2>
          <div className="grid grid-cols-2 gap-3">
            {rackets.slice(0, 2).map((r, i) => {
              const mel = i === 0 ? melA : melB
              const color = COLORS[i]
              return (
                <div key={r.id} className="rounded-xl border border-aqua/15 bg-white/50 p-3 flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold truncate" style={{ color }}>{r.name}</span>
                  {mel.length > 0 ? (
                    mel.map((m, j) => (
                      <span key={j} className="text-[11px] text-tinta/65 leading-snug">{m}</span>
                    ))
                  ) : (
                    <span className="text-[11px] text-tinta/35 italic leading-snug">equilibrada</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Specs */}
      <section>
        <h2 className="text-xs font-bold text-tinta/40 uppercase tracking-wider mb-4">Especificações</h2>
        <div className="rounded-xl border border-aqua/20 overflow-hidden">
          {specs.map(({ label, values }, idx) => (
            <div
              key={label}
              className={`grid grid-cols-[auto_1fr_1fr] border-b border-aqua/10 last:border-0 ${
                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }`}
            >
              <div className="px-3 py-2.5 text-tinta/50 text-[11px] font-medium whitespace-nowrap min-w-[88px]">
                {label}
              </div>
              {values.map((v, i) => (
                <div key={i} className="px-2.5 py-2.5 text-[12px] text-tinta font-medium border-l border-aqua/10 leading-snug">
                  {v ?? <span className="text-tinta/25">—</span>}
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
