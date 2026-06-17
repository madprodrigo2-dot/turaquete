import Link from 'next/link'
import type { RacketWithInsights } from '@/lib/recommend'
import { buildSpecRows } from './SpecsGrid'
import RacketImageTile from './RacketImageTile'

const SCORES = [
  { key: 'power',           label: 'Potencia'     },
  { key: 'control',         label: 'Controle'     },
  { key: 'comfort',         label: 'Conforto'     },
  { key: 'maneuverability', label: 'Manuseio'     },
  { key: 'spin',            label: 'Spin'         },
  { key: 'stability',       label: 'Estabilidade' },
] as const

const COLORS = ['#FF5E3A', '#0CC0BE'] as const

function ScoreBar({ value, color }: { value: number | null; color: string }) {
  if (value == null) return <span className="text-tinta/30 text-xs">—</span>
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[32px]">
        <div
          className="h-full rounded-full"
          style={{ width: `${value * 10}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums w-4 text-right shrink-0" style={{ color }}>
        {value}
      </span>
    </div>
  )
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

  return (
    <div className="flex flex-col gap-7">

      {/* Racket headers */}
      <div className="grid grid-cols-2 gap-3">
        {rackets.map((r, i) => {
          const color = COLORS[i]
          const price = r.price != null
            ? `R$${r.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
            : null
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
              </div>
            </div>
          )
        })}
      </div>

      {/* Scores */}
      <section>
        <h2 className="text-xs font-bold text-tinta/40 uppercase tracking-wider mb-4">Pontuacoes</h2>
        <div className="flex flex-col gap-4">
          {SCORES.map(({ key, label }) => {
            const vals = rackets.map(r => {
              const ins = r.racket_insights as Record<string, number | null> | null
              return ins ? (ins[key] ?? null) : null
            })
            return (
              <div key={key}>
                <span className="text-xs text-tinta/60 block mb-1.5">{label}</span>
                <div className="grid grid-cols-2 gap-3">
                  {vals.map((v, i) => (
                    <ScoreBar key={i} value={v} color={COLORS[i]} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Specs */}
      <section>
        <h2 className="text-xs font-bold text-tinta/40 uppercase tracking-wider mb-4">Especificacoes</h2>
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
          Ainda com duvida? Tury analisa o seu perfil e ajuda a decidir qual e a certa pra voce.
        </p>
        <Link
          href="/"
          className="bg-aqua text-tinta font-semibold text-sm py-3 px-5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-center block"
        >
          Perguntar ao Tury
        </Link>
      </div>

      {/* New comparison */}
      <Link
        href="/comparar"
        className="text-sm text-tinta/50 hover:text-aqua transition-colors text-center block pb-2"
      >
        ← Nova comparacao
      </Link>

    </div>
  )
}
