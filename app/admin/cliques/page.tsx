import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import AdminPeriodFilter from '../intencoes/AdminPeriodFilter'

export const dynamic = 'force-dynamic'

interface TotalsRow  { total: number; afiliado: number; oficial: number }
interface SlugRow    { slug: string; nome: string | null; total: number }
interface DayRow     { day: string; total: number }
interface ReferrerRow{ referrer: string; total: number }

function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function pct(num: number, den: number): string {
  return den === 0 ? '—' : `${Math.round((num / den) * 100)}%`
}

function shortenReferrer(ref: string): string {
  if (ref === 'direto') return 'Direto / sem referrer'
  try {
    const url = new URL(ref.startsWith('http') ? ref : `https://${ref}`)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return ref.length > 60 ? ref.slice(0, 60) + '…' : ref
  }
}

export default async function CliquesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}) {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const { days: daysParam = '30', from: fromParam, to: toParam } = await searchParams
  const cookieStore  = await cookies()
  const includeTest  = cookieStore.get('admin_test_view')?.value === '1'

  let cutoffDate: string
  let daysLabel: string
  if (fromParam) {
    cutoffDate = new Date(fromParam + 'T00:00:00').toISOString()
    daysLabel  = `${fromParam} → ${toParam ?? 'hoje'}`
  } else {
    const daysBack = daysParam === 'all' ? 3650 : Math.max(1, parseInt(daysParam) || 30)
    cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
    daysLabel  = daysParam === '1' ? 'hoje' : daysParam === 'all' ? 'todos os tempos' : `últimos ${daysParam} dias`
  }

  const sb = getAdmin()

  const [totalsRes, slugsRes, daysRes, referrersRes] = await Promise.all([
    sb.rpc('admin_click_totals',       { p_cutoff: cutoffDate, p_include_test: includeTest }),
    sb.rpc('admin_click_top_slugs',    { p_cutoff: cutoffDate, p_include_test: includeTest, p_limit: 20 }),
    sb.rpc('admin_click_by_day',       { p_include_test: includeTest }),
    sb.rpc('admin_click_top_referrers',{ p_cutoff: cutoffDate, p_include_test: includeTest }),
  ])

  const totals    = (totalsRes.data?.[0]   ?? { total: 0, afiliado: 0, oficial: 0 }) as TotalsRow
  const slugs     = (slugsRes.data         ?? []) as SlugRow[]
  const days      = (daysRes.data          ?? []) as DayRow[]
  const referrers = (referrersRes.data     ?? []) as ReferrerRow[]

  const maxDayCount = days.length > 0 ? Math.max(...days.map(d => d.total)) : 1

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-800">Cliques em comprar</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">{daysLabel}</p>
        </div>
        <Suspense fallback={null}>
          <AdminPeriodFilter current={fromParam ? '' : daysParam} currentFrom={fromParam} currentTo={toParam} />
        </Suspense>
      </div>

      {/* Cards principais */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total de cliques',
              value: String(totals.total),
              sub: daysLabel,
              accent: false,
            },
            {
              label: 'Links de afiliado',
              value: String(totals.afiliado),
              sub: pct(totals.afiliado, totals.total) + ' do total',
              accent: true,
            },
            {
              label: 'Links oficiais',
              value: String(totals.oficial),
              sub: pct(totals.oficial, totals.total) + ' do total',
              accent: false,
            },
            {
              label: 'Raquetes distintas',
              value: String(slugs.length),
              sub: 'com pelo menos 1 clique',
              accent: false,
            },
          ].map(({ label, value, sub, accent }) => (
            <div
              key={label}
              className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1 ${accent ? 'border-teal-300' : 'border-gray-100'}`}
            >
              <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
              <p className={`text-2xl font-bold ${accent ? 'text-teal-700' : 'text-gray-900'}`}>{value}</p>
              <p className="text-[10px] text-gray-400">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Afiliado vs Oficial */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
          Afiliado vs oficial <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">— {daysLabel}</span>
        </h2>
        {totals.total === 0 ? (
          <p className="text-gray-400 italic text-xs">Ainda nao ha cliques registrados neste periodo.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
            {[
              { label: 'Afiliado (gera comissao)', count: totals.afiliado, color: 'bg-[#0CC0BE]' },
              { label: 'Oficial (sem comissao)',   count: totals.oficial,  color: 'bg-gray-300'   },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-44 shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${totals.total > 0 ? Math.round((count / totals.total) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-800 w-8 text-right">{count}</span>
                <span className="text-[11px] text-gray-400 w-10 text-right">{pct(count, totals.total)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ranking de raquetes */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
          Raquetes mais clicadas <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">— {daysLabel}</span>
        </h2>
        {slugs.length === 0 ? (
          <p className="text-gray-400 italic text-xs">Ainda nao ha cliques registrados neste periodo.</p>
        ) : (
          <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-50 text-gray-400 uppercase">
                <tr>
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">Raquete</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Slug</th>
                  <th className="text-right px-4 py-2">Cliques</th>
                  <th className="text-right px-4 py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {slugs.map((r, i) => (
                  <tr key={r.slug} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      {r.nome ?? <span className="italic text-gray-400">{r.slug}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono hidden md:table-cell">{r.slug}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{r.total}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{pct(r.total, totals.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-gray-300 px-4 py-2">{totals.total} cliques totais no periodo</p>
          </div>
        )}
      </section>

      {/* Cliques por dia */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
          Cliques por dia <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">— últimos 30 dias</span>
        </h2>
        {days.length === 0 ? (
          <p className="text-gray-400 italic text-xs">Sem cliques nos últimos 30 dias.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {days.map(d => {
              const pct = maxDayCount > 0 ? Math.round((d.total / maxDayCount) * 100) : 0
              return (
                <div key={d.day} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs text-gray-500 w-16 shrink-0">
                    {new Date(d.day + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#0CC0BE]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-800 w-6 text-right shrink-0">{d.total}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Origem do trafego */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
          Origem do trafego <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">— {daysLabel}</span>
        </h2>
        {referrers.length === 0 ? (
          <p className="text-gray-400 italic text-xs">Ainda nao ha dados de origem neste periodo.</p>
        ) : (
          <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-50 text-gray-400 uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Origem</th>
                  <th className="px-4 py-2 w-1/3 hidden md:table-cell"></th>
                  <th className="text-right px-4 py-2">Cliques</th>
                  <th className="text-right px-4 py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {referrers.map(r => (
                  <tr key={r.referrer} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate" title={r.referrer}>
                      {shortenReferrer(r.referrer)}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#FFC42E]"
                          style={{ width: `${referrers[0]?.total > 0 ? Math.round((r.total / referrers[0].total) * 100) : 0}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{r.total}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{pct(r.total, totals.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  )
}
