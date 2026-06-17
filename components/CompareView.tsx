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

const COLORS = ['#FF5E3A', '#0CC0BE'] as const

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
      {rackets.length === 2 && (
        <section className="bg-white/60 rounded-2xl p-4">
          <h2 className="text-xs font-bold text-tinta/40 uppercase tracking-wider mb-3">Perfil</h2>
          <CompareHexagon rackets={rackets as [RacketWithInsights, RacketWithInsights]} />
        </section>
      )}

      {/* Scores — symmetric 3-col layout */}
      <section>
        <h2 className="text-xs font-bold text-tinta/40 uppercase tracking-wider mb-4">Pontuações</h2>
        <div className="flex flex-col gap-3">
          {SCORES.map(({ key, label }) => {
            const ins0 = rackets[0]?.racket_insights as Record<string, number | null> | null
            const ins1 = rackets[1]?.racket_insights as Record<string, number | null> | null
            const valA = ins0 ? (ins0[key] ?? null) : null
            const valB = ins1 ? (ins1[key] ?? null) : null
            return (
              <div key={key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
                {/* A side — bar fills right toward label */}
                <div className="flex items-center justify-end gap-1.5">
                  {valA != null ? (
                    <>
                      <span className="text-[11px] font-bold tabular-nums w-4 text-right shrink-0" style={{ color: COLORS[0] }}>
                        {valA}
                      </span>
                      <div className="w-12 h-2 bg-gray-100 rounded-full overflow-hidden relative shrink-0">
                        <div
                          className="absolute right-0 top-0 h-full rounded-full"
                          style={{ width: `${valA * 10}%`, backgroundColor: COLORS[0] }}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="text-tinta/25 text-[11px]">—</span>
                  )}
                </div>
                {/* Label */}
                <span className="text-[11px] text-tinta/55 text-center whitespace-nowrap px-1.5 shrink-0">
                  {label}
                </span>
                {/* B side — bar fills left from label */}
                <div className="flex items-center justify-start gap-1.5">
                  {valB != null ? (
                    <>
                      <div className="w-12 h-2 bg-gray-100 rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${valB * 10}%`, backgroundColor: COLORS[1] }}
                        />
                      </div>
                      <span className="text-[11px] font-bold tabular-nums w-4 shrink-0" style={{ color: COLORS[1] }}>
                        {valB}
                      </span>
                    </>
                  ) : (
                    <span className="text-tinta/25 text-[11px]">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

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
