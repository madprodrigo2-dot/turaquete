import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import AdminPeriodFilter from '../intencoes/AdminPeriodFilter'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

interface RecRow    { racket_id: number; confidence: number | null; rank: number | null }
interface ClickRow  { racket_id: number; destination_type: string | null }
interface RacketRow { id: number; name: string; slug: string; affiliate_url: string | null }

function pct(num: number, den: number): string {
  return den === 0 ? '—' : `${Math.round((num / den) * 100)}%`
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const { days: daysParam = '30' } = await searchParams
  const daysBack   = daysParam === 'all' ? 3650 : Math.max(1, parseInt(daysParam) || 30)
  const cutoff     = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  const daysLabel  = daysParam === '1' ? 'hoje' : daysParam === 'all' ? 'todos os tempos' : `últimos ${daysParam} dias`

  const sb = getAdmin()

  const [recRows, clickRows, racketRows] = await Promise.all([
    sb.from('recommendation_events')
      .select('racket_id, confidence, rank')
      .gte('created_at', cutoff)
      .then(r => (r.data ?? []) as RecRow[]),

    sb.from('link_clicks')
      .select('racket_id, destination_type')
      .gte('created_at', cutoff)
      .then(r => (r.data ?? []) as ClickRow[]),

    sb.from('rackets')
      .select('id, name, slug, affiliate_url')
      .eq('publicada', true)
      .then(r => (r.data ?? []) as RacketRow[]),
  ])

  const racketById = new Map(racketRows.map(r => [r.id, r]))

  // Aggregate per racket
  const racketIds = new Set([
    ...recRows.map(r => r.racket_id),
    ...clickRows.map(r => r.racket_id),
  ])

  type RowData = {
    id: number
    name: string
    slug: string
    hasAffiliate: boolean
    recs: number
    clicks: number
    mlClicks: number
    avgConfidence: number | null
    avgRank: number | null
  }

  const rows: RowData[] = []
  for (const id of racketIds) {
    const racket = racketById.get(id)
    if (!racket) continue
    const myRecs   = recRows.filter(r => r.racket_id === id)
    const myClicks = clickRows.filter(r => r.racket_id === id)
    const confs    = myRecs.map(r => r.confidence).filter((v): v is number => v != null)
    const ranks    = myRecs.map(r => r.rank).filter((v): v is number => v != null)
    rows.push({
      id,
      name: racket.name,
      slug: racket.slug,
      hasAffiliate: !!racket.affiliate_url,
      recs:    myRecs.length,
      clicks:  myClicks.length,
      mlClicks: myClicks.filter(r => r.destination_type === 'ml').length,
      avgConfidence: confs.length ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : null,
      avgRank:  ranks.length ? parseFloat((ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1)) : null,
    })
  }

  rows.sort((a, b) => b.recs - a.recs || b.clicks - a.clicks)

  const affiliateRows = rows.filter(r => r.hasAffiliate)
  const totalRecs     = recRows.length
  const totalClicks   = clickRows.length

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-800">Ranking de tráfico</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {totalRecs} recomendações · {totalClicks} cliques — {daysLabel}
          </p>
        </div>
        <Suspense fallback={null}>
          <AdminPeriodFilter current={daysParam} />
        </Suspense>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Raquetes recomendadas', value: String(rows.filter(r => r.recs > 0).length) },
          { label: 'Total recomendações',   value: String(totalRecs) },
          { label: 'Total cliques /ir/',    value: String(totalClicks) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
            <p className="text-base font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabela principal */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
          Por raquete — {daysLabel}
        </h2>
        {rows.length === 0 ? (
          <p className="text-gray-400 italic text-xs">Sem dados no período.</p>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-50 text-gray-400 uppercase">
                <tr>
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">Raquete</th>
                  <th className="text-right px-4 py-2">Recs</th>
                  <th className="text-right px-4 py-2">Cliques</th>
                  <th className="text-right px-4 py-2">Taxa</th>
                  <th className="text-right px-4 py-2">Score med.</th>
                  <th className="text-right px-4 py-2">Rank med.</th>
                  <th className="text-center px-4 py-2">ML</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      <a href={`/raquetes/${r.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 hover:underline">
                        {r.name}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">{r.recs}</td>
                    <td className="px-4 py-2 text-right">{r.clicks}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{pct(r.clicks, r.recs)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{r.avgConfidence ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{r.avgRank ?? '—'}</td>
                    <td className="px-4 py-2 text-center">
                      {r.hasAffiliate
                        ? <span className="text-green-500 text-base" title="Tem afiliado ML">✓</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-gray-300 px-4 py-2">{rows.length} raquetes com atividade no período</p>
          </div>
        )}
      </section>

      {/* Seção filtrada: só afiliados ML */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">
          Afiliados ML — cliques rastreados
        </h2>
        <p className="text-[11px] text-gray-400 mb-3">
          Comparar manualmente com o painel ML · {daysLabel}
        </p>
        {affiliateRows.length === 0 ? (
          <p className="text-gray-400 italic text-xs">Nenhuma raquete com afiliado ML teve atividade no período.</p>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-50 text-gray-400 uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Raquete</th>
                  <th className="text-right px-4 py-2">Recs</th>
                  <th className="text-right px-4 py-2">Cliques /ir/</th>
                  <th className="text-right px-4 py-2">Cliques ML</th>
                  <th className="text-right px-4 py-2">Taxa rec→clique</th>
                </tr>
              </thead>
              <tbody>
                {affiliateRows.map(r => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <td className="px-4 py-2 font-medium text-gray-800">{r.name}</td>
                    <td className="px-4 py-2 text-right">{r.recs}</td>
                    <td className="px-4 py-2 text-right font-semibold">{r.clicks}</td>
                    <td className="px-4 py-2 text-right text-teal-600 font-semibold">{r.mlClicks}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{pct(r.clicks, r.recs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-gray-300 px-4 py-2">
              Cliques ML = cliques em /ir/ com destination_type=ml. Comparar com painel Mercado Livre manualmente.
            </p>
          </div>
        )}
      </section>

    </div>
  )
}
