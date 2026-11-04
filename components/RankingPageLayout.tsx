import Link from 'next/link'
import type { RankingEntry } from '@/lib/ranking'
import { gerarExplicacoes } from '@/lib/explicador'
import { getDisplayName } from '@/lib/displayName'
import SiteNav from './SiteNav'
import RacketBadgeOverlay from './RacketBadgeOverlay'

export interface FaqItem {
  question: string
  answer: string
}

interface Props {
  title: string
  subtitle: string
  entries: RankingEntry[]
  updatedAtLabel: string
  faqItems?: FaqItem[]
}

function cap(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str
}

// Linhas fixas da tabela comparativa — mesmas colunas de dado pra todas as
// raquetes do ranking, "—" quando a ficha não informa (nunca inventa valor).
// Mesma fonte de dado que SpecsGrid.tsx, só que em formato de tabela em vez
// de lista por raquete.
function specCell(entry: RankingEntry, field: 'peso' | 'balance' | 'face' | 'core' | 'espessura' | 'ano' | 'preco'): string {
  const r = entry.racket
  const extra = (r.specs_extra ?? {}) as Record<string, unknown>
  switch (field) {
    case 'peso':      return r.weight_g ? `~${r.weight_g}g` : '—'
    case 'balance':    return r.balance ? cap(r.balance) : '—'
    case 'face':       return r.face_material ? cap(r.face_material) : '—'
    case 'core':       return r.core ? cap(r.core) : '—'
    case 'espessura': {
      const mm = extra.espessura_mm as number | null | undefined
      return mm != null ? `${mm}mm` : '—'
    }
    case 'ano':        return r.model_year ? String(r.model_year) : '—'
    case 'preco':      return r.price ? `R$ ${r.price.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—'
  }
}

const SPEC_ROWS: { label: string; field: Parameters<typeof specCell>[1] }[] = [
  { label: 'Preço',           field: 'preco' },
  { label: 'Peso',            field: 'peso' },
  { label: 'Balance',         field: 'balance' },
  { label: 'Material da face', field: 'face' },
  { label: 'Núcleo (EVA)',    field: 'core' },
  { label: 'Espessura',       field: 'espessura' },
  { label: 'Ano',             field: 'ano' },
]

export default function RankingPageLayout({ title, subtitle, entries, updatedAtLabel, faqItems = [] }: Props) {
  return (
    <div className="min-h-screen sand-texture">
      <SiteNav maxWidth="max-w-4xl lg:max-w-5xl" />

      <div className="max-w-4xl lg:max-w-5xl mx-auto px-5 md:px-8 py-8 flex flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-tinta">{title}</h1>
          <p className="text-tinta/60 text-sm md:text-base">{subtitle}</p>
          <p className="text-tinta/40 text-xs mt-1">Atualizado em {updatedAtLabel} · dados reais do catálogo Turaquete</p>
        </div>

        {/* Ranking numerado */}
        <div className="flex flex-col gap-4">
          {entries.map((entry, i) => {
            const rank = i + 1
            const r = entry.racket
            const nameDisplay = getDisplayName(r)
            const athleteRaw = (r.specs_extra as Record<string, unknown> | null)?.atleta
            const athlete: string | undefined = Array.isArray(athleteRaw)
              ? (athleteRaw as string[]).filter(Boolean).join(' & ') || undefined
              : typeof athleteRaw === 'string' ? athleteRaw : undefined
            const bullets = gerarExplicacoes(r).slice(0, 3)
            const price = r.price
              ? `R$ ${r.price.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
              : null

            return (
              <div
                key={r.id}
                id={`rank-${rank}`}
                className="rounded-2xl bg-white shadow-card border border-[rgba(14,58,64,0.06)] overflow-hidden flex flex-col sm:flex-row gap-0"
              >
                {/* Número + imagem */}
                <div className="relative sm:w-48 shrink-0 h-48 sm:h-auto bg-white flex items-center justify-center p-4">
                  <span className="absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-gold-deep text-white text-sm font-bold flex items-center justify-center shadow-sm">
                    {rank}
                  </span>
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt={r.name} className="w-full h-full object-contain" />
                  ) : null}
                  {/* brandCorner="right" — o canto esquerdo já tem o número do ranking
                      (rounded-full acima); "left" fazia o logo da marca cair no mesmo
                      top-1.5 left-1.5 e se sobrepor ao número. Bug real, Rodrigo 2026-11-04. */}
                  <RacketBadgeOverlay athlete={athlete} brandLogo={r.brands?.logo_url} brandName={r.brands?.name} brandCorner="right" />
                </div>

                {/* Conteúdo */}
                <div className="p-4 flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/raquetes/${r.slug}`} className="font-heading font-semibold text-tinta text-base leading-tight hover:underline">
                      {rank}. {nameDisplay}
                    </Link>
                    {price && <span className="font-heading text-coral font-bold text-sm shrink-0">{price}</span>}
                  </div>

                  {/* Nota X/10 removida da UI (Rodrigo 2026-11-04 — "6.5/10" passa
                      impressão ruim pro público). compat_pct sozinho comunica o mesmo
                      em positivo; o score interno continua intacto em RankingEntry,
                      só não aparece mais aqui. Quando compat_pct vier null (score
                      muito baixo), não mostra nada — nunca cai de volta pro score cru. */}
                  {entry.compatPct != null && (
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white border border-aqua/30 px-2.5 py-1 text-[11px] font-bold text-tinta shadow-sm">
                        {entry.compatPct}% compatível
                      </span>
                    </div>
                  )}

                  {bullets.length > 0 && (
                    <ul className="flex flex-col gap-1 mt-1">
                      {bullets.map((linha, bi) => (
                        <li key={bi} className="flex items-start gap-2 text-sm text-tinta/70 leading-snug">
                          <span className="text-aqua shrink-0 mt-0.5">–</span>
                          {linha}
                        </li>
                      ))}
                    </ul>
                  )}

                  <Link
                    href={`/ir/${r.slug}`}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="mt-auto w-fit text-center rounded-full bg-coral text-white text-xs font-heading font-semibold py-2 px-4 shadow-cta hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Ver na loja →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tabela comparativa */}
        {entries.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-tinta">Comparação de especificações</h2>
            <div className="overflow-x-auto rounded-2xl border border-[rgba(14,58,64,0.06)] bg-white shadow-card">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-aqua/10">
                    <th className="text-left p-3 text-tinta/50 font-medium text-xs sticky left-0 bg-white">Especificação</th>
                    {entries.map((e, i) => (
                      <th key={e.racket.id} className="text-left p-3 text-tinta font-semibold whitespace-nowrap min-w-[140px]">
                        {i + 1}. {getDisplayName(e.racket)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SPEC_ROWS.map(({ label, field }, ri) => (
                    <tr key={label} className={ri < SPEC_ROWS.length - 1 ? 'border-b border-aqua/10' : ''}>
                      <td className="p-3 text-tinta/60 sticky left-0 bg-white font-medium">{label}</td>
                      {entries.map(e => (
                        <td key={e.racket.id} className="p-3 text-tinta whitespace-nowrap">{specCell(e, field)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FAQ */}
        {faqItems.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-tinta">Perguntas frequentes</h2>
            <div className="flex flex-col gap-2">
              {faqItems.map((item, i) => (
                <details key={i} className="rounded-xl bg-white border border-[rgba(14,58,64,0.06)] shadow-card p-4 group">
                  <summary className="font-semibold text-tinta text-sm cursor-pointer list-none flex items-center justify-between gap-2">
                    {item.question}
                    <span className="text-tinta/40 text-xs shrink-0 group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <p className="text-tinta/70 text-sm leading-relaxed mt-2">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* CTA final */}
        <Link
          href="/"
          className="w-full bg-coral text-white font-semibold text-base py-4 rounded-2xl hover:opacity-90 hover:shadow-[0_8px_28px_rgba(255,94,58,0.40)] active:scale-[0.98] transition-all shadow-md text-center block"
        >
          Encontrar minha raquete ideal
        </Link>

      </div>
    </div>
  )
}
