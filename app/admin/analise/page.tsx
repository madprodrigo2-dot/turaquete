import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import AdminPeriodFilter from '../intencoes/AdminPeriodFilter'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

interface IntencaoRow   { intencao_detectada: string | null; total: number }
interface StarterRow    { starter: string | null; total: number }
interface SessionCostRow {
  session_id:    string
  total_brl:     number
  total_usd:     number
  turns:         number
  had_rec:       boolean
  first_turn_at: string
}
interface ClickRow { session_id: string; event_type: string }

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
function fmtBrl(v: number, decimals = 4) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}
function avg(arr: number[]): number | null {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
}

export default async function AnaliseAdmin({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login')
  }

  const { days: daysParam = '30' } = await searchParams
  const daysBack   = daysParam === 'all' ? 3650 : Math.max(1, parseInt(daysParam) || 30)
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  const daysLabel  = daysParam === '1' ? 'hoje' : daysParam === 'all' ? 'todos os tempos' : `últimos ${daysParam} dias`

  const sb  = getAdmin()
  const now = Date.now()
  const ago7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Column existence check — shows diagnostic when migration not yet run
  const columnCheck = await sb
    .from('conversations')
    .select('primeira_mensagem')
    .limit(1)
    .then(r => ({ ok: !r.error, errorMsg: r.error?.message ?? null }))

  const supabaseUrl = process.env.SUPABASE_URL ?? ''
  const supabaseDomain = supabaseUrl.replace('https://', '').replace(/\/$/, '')
  const primeiraMsgColumnMissing = !columnCheck.ok

  const [intentRows, starterRows, sessionCostRows, clickRows] = await Promise.all([
    sb.rpc('admin_intencao_counts').then(r => (r.data ?? []) as IntencaoRow[]),
    sb.rpc('admin_starter_counts').then(r => (r.data ?? []) as StarterRow[]),
    sb.rpc('admin_cost_by_session', { days_back: daysBack }).then(r => (r.data ?? []) as SessionCostRow[]),
    sb.from('feedback_events')
      .select('session_id, event_type')
      .in('event_type', ['ver_na_loja', 'ver_analise'])
      .gte('created_at', cutoffDate)
      .then(r => (r.data ?? []) as ClickRow[]),
  ])

  const intencoes: IntencaoRow[] = intentRows.length
    ? intentRows
    : await sb.from('conversations').select('intencao_detectada')
        .not('intencao_detectada', 'is', null)
        .then(r => {
          const c: Record<string, number> = {}
          for (const row of (r.data ?? []) as { intencao_detectada: string }[])
            c[row.intencao_detectada] = (c[row.intencao_detectada] ?? 0) + 1
          return Object.entries(c)
            .map(([intencao_detectada, total]) => ({ intencao_detectada, total }))
            .sort((a, b) => b.total - a.total)
        })

  const starters: StarterRow[] = starterRows.length
    ? starterRows
    : await sb.from('conversations').select('starter_usado')
        .not('primeira_mensagem', 'is', null)
        .then(r => {
          const c: Record<string, number> = {}
          for (const row of (r.data ?? []) as { starter_usado: string | null }[]) {
            const k = row.starter_usado ?? 'livre'
            c[k] = (c[k] ?? 0) + 1
          }
          return Object.entries(c)
            .map(([starter, total]) => ({ starter: starter === 'livre' ? null : starter, total }))
            .sort((a, b) => b.total - a.total)
        })

  const sessions          = sessionCostRows.filter(r => r.total_brl > 0)
  const sessions7         = sessions.filter(r => r.first_turn_at >= ago7)
  const sessionsWithRec   = sessions.filter(r => r.had_rec)
  const clickSessionIds   = new Set(clickRows.map(r => r.session_id))
  const affiliateClicks   = clickRows.filter(r => r.event_type === 'ver_na_loja')
  const sessionsWithClick = sessions.filter(r => clickSessionIds.has(r.session_id))
  const taxaConversao     = sessions.length > 0 ? sessionsWithClick.length / sessions.length : 0
  const taxaRec           = sessions.length > 0 ? sessionsWithRec.length / sessions.length : null
  const avgBrl            = avg(sessions.map(r => r.total_brl))
  const avgTurns          = avg(sessions.map(r => r.turns))
  const avg7Brl           = avg(sessions7.map(r => r.total_brl))

  // ── Insights ───────────────────────────────────────────────────────────────
  type Insight = { level: 'ok' | 'warn' | 'info' | 'neutral'; text: string }
  const insights: Insight[] = []
  const MIN_DATA    = 5
  const totalConv   = sessions.length
  const totalIntAll = sessions.length + sessionCostRows.filter(r => r.total_brl === 0).length

  if (primeiraMsgColumnMissing) {
    insights.push({
      level: 'warn',
      text: `Coluna primeira_mensagem ausente (${supabaseDomain}). Execute a migration abaixo para habilitar análise de mensagens.`,
    })
  }

  if (totalConv < MIN_DATA) {
    insights.push({
      level: 'neutral',
      text: `Apenas ${totalConv} conversa${totalConv !== 1 ? 's' : ''} com custo no período — ainda poucos dados para tendências confiáveis.`,
    })
  } else {
    const totalIntencoes = intencoes.reduce((a, r) => a + r.total, 0)
    const topIntent      = intencoes[0] ?? null
    if (topIntent && totalIntencoes > 0) {
      insights.push({
        level: 'info',
        text: `"${topIntent.intencao_detectada}" é a intenção #1 (${pct(topIntent.total, totalIntencoes)} das conversas com intenção detectada). Vale priorizar esse fluxo no copy e nos starters.`,
      })
    }

    const totalMsg   = starters.reduce((a, r) => a + r.total, 0)
    const livreCount = starters.find(r => r.starter === null)?.total ?? 0
    if (totalMsg >= MIN_DATA) {
      if (livreCount / totalMsg > 0.4) {
        insights.push({ level: 'info', text: `${pct(livreCount, totalMsg)} escrevem livremente (sem starter) — chegam com casos específicos em mente. Analise as mensagens livres para descobrir padrões.` })
      } else {
        insights.push({ level: 'ok', text: `${pct(livreCount, totalMsg)} digitam livremente; maioria usa starters. Starters estão guiando bem a conversa.` })
      }
    }

    if (taxaRec !== null) {
      insights.push({
        level: taxaRec >= 0.5 ? 'ok' : 'warn',
        text: `${pct(sessionsWithRec.length, totalConv)} das conversas chegaram a uma recomendação (${daysLabel}).${taxaRec < 0.5 ? ' Abaixo de 50% — pode indicar abandono precoce ou dificuldade de qualificação.' : ''}`,
      })
    }

    if (sessions.length >= MIN_DATA) {
      const msg = taxaConversao < 0.08
        ? `${pct(sessionsWithClick.length, totalConv)} clicaram em loja ou análise (${daysLabel}). Abaixo de 8% — verificar se os links de afiliado estão visíveis e ativos.`
        : `${pct(sessionsWithClick.length, totalConv)} clicaram em loja ou análise (${daysLabel}).`
      insights.push({ level: taxaConversao >= 0.08 ? 'ok' : 'warn', text: msg })
    }

    if (avgBrl != null && avgTurns != null) {
      insights.push({
        level: 'neutral',
        text: `Custo médio ${fmtBrl(avgBrl, 4)}/conversa · ${avgTurns.toFixed(1)} turnos/sessão em média (${daysLabel}).${avgTurns > 6 ? ' Muitos turnos — agente pode estar demorando para qualificar.' : ''}`,
      })
    }

    if (avg7Brl != null && avgBrl != null && sessions7.length >= 3 && sessions.length >= 10) {
      const diff = avg7Brl - avgBrl
      if (Math.abs(diff) / avgBrl > 0.2) {
        insights.push({
          level: diff > 0 ? 'warn' : 'ok',
          text: `Custo médio nos últimos 7 dias (${fmtBrl(avg7Brl, 4)}) está ${diff > 0 ? '+' : ''}${Math.round((diff / avgBrl) * 100)}% vs o período (${fmtBrl(avgBrl, 4)}).${diff > 0 ? ' Verificar se houve mudança no fluxo.' : ' Tendência de redução.'}`,
        })
      }
    }
  }

  const insightIcon: Record<Insight['level'], string> = { ok: '✅', warn: '⚠️', info: '💡', neutral: '📊' }
  const insightBg: Record<Insight['level'], string> = {
    ok:      'bg-emerald-50 border-emerald-200 text-emerald-800',
    warn:    'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    neutral: 'bg-gray-50 border-gray-200 text-gray-700',
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Análise Inteligente</h1>
          <p className="text-gray-400 text-xs mt-0.5">{session.user?.email} · {daysLabel}</p>
        </div>
        <Suspense fallback={null}>
          <AdminPeriodFilter current={daysParam} />
        </Suspense>
      </div>

      {/* ── Migration notice ── */}
      {primeiraMsgColumnMissing && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col gap-2">
          <p className="font-semibold text-amber-800 text-sm">
            ⚠️ Coluna <code className="font-mono bg-amber-100 px-1 rounded">primeira_mensagem</code> ausente
            {supabaseDomain && (
              <span className="font-normal ml-2 text-amber-600 text-xs">— projeto: <span className="font-mono">{supabaseDomain}</span></span>
            )}
          </p>
          {columnCheck.errorMsg && (
            <p className="text-amber-700 text-xs font-mono bg-amber-100 px-2 py-1 rounded">
              Erro PostgREST: {columnCheck.errorMsg}
            </p>
          )}
          <p className="text-amber-700 text-xs">Execute no Supabase SQL Editor do projeto acima:</p>
          <pre className="bg-amber-100 rounded-lg px-4 py-3 text-xs font-mono text-amber-900 overflow-x-auto whitespace-pre-wrap">{`ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS primeira_mensagem TEXT;

-- Também garantir as outras colunas novas
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS starter_usado TEXT,
  ADD COLUMN IF NOT EXISTS intencao_detectada TEXT;`}</pre>
        </div>
      )}

      {/* ── Insights ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Insights <span className="text-gray-400 font-normal text-xs">— {daysLabel}</span>
        </h2>
        <div className="flex flex-col gap-2">
          {insights.map((ins, i) => (
            <div key={i} className={`rounded-xl border px-4 py-3 text-sm flex gap-3 items-start ${insightBg[ins.level]}`}>
              <span className="text-base shrink-0 mt-px">{insightIcon[ins.level]}</span>
              <p className="leading-snug">{ins.text}</p>
            </div>
          ))}
          {insights.length === 0 && (
            <p className="text-gray-400 italic text-xs">Nenhum dado disponível para o período.</p>
          )}
        </div>
      </section>

      {/* ── Intenções breakdown ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-1">Distribuição de intenções</h2>
        <p className="text-[11px] text-gray-400 mb-3">Todos os tempos (independente do filtro de período)</p>
        {intencoes.length === 0 ? (
          <p className="text-gray-400 italic text-xs">Sem dados ainda.</p>
        ) : (
          <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Intenção</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-right px-4 py-2">%</th>
                <th className="px-4 py-2 w-1/3"></th>
              </tr>
            </thead>
            <tbody>
              {intencoes.map(r => {
                const total = intencoes.reduce((a, x) => a + x.total, 0)
                return (
                  <tr key={r.intencao_detectada} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-mono text-gray-700">{r.intencao_detectada}</td>
                    <td className="px-4 py-2 text-right font-semibold">{r.total}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{pct(r.total, total)}</td>
                    <td className="px-4 py-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-400 rounded-full"
                          style={{ width: `${Math.round((r.total / intencoes.reduce((a, x) => a + x.total, 0)) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Starters ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-1">Uso de starters</h2>
        <p className="text-[11px] text-gray-400 mb-3">Todos os tempos</p>
        {starters.length === 0 ? (
          <p className="text-gray-400 italic text-xs">Sem dados ainda.</p>
        ) : (
          <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Starter</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-right px-4 py-2">%</th>
                <th className="px-4 py-2 w-1/3"></th>
              </tr>
            </thead>
            <tbody>
              {starters.map(r => {
                const total = starters.reduce((a, x) => a + x.total, 0)
                return (
                  <tr key={r.starter ?? 'livre'} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      {r.starter ?? <span className="italic text-gray-500">livre (digitou)</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">{r.total}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{pct(r.total, total)}</td>
                    <td className="px-4 py-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-300 rounded-full"
                          style={{ width: `${Math.round((r.total / starters.reduce((a, x) => a + x.total, 0)) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Métricas de engajamento ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Engajamento <span className="text-gray-400 font-normal text-xs">— {daysLabel}</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Taxa de recomendação',
              value: taxaRec !== null ? pct(sessionsWithRec.length, totalConv) : '—',
              sub:   `${sessionsWithRec.length} de ${totalConv} conv.`,
              ok:    taxaRec !== null && taxaRec >= 0.5,
            },
            {
              label: 'Clique em loja/análise',
              value: pct(sessionsWithClick.length, sessions.length),
              sub:   `${sessionsWithClick.length} sessões`,
              ok:    taxaConversao >= 0.08,
            },
            {
              label: 'Cliques "Ver na loja"',
              value: String(affiliateClicks.length),
              sub:   'afiliado',
              ok:    null,
            },
            {
              label: 'Turnos médios/sessão',
              value: avgTurns != null ? avgTurns.toFixed(1) : '—',
              sub:   avgTurns != null && avgTurns > 6 ? '⚠ acima do esperado' : 'ok',
              ok:    avgTurns != null ? avgTurns <= 6 : null,
            },
          ].map(({ label, value, sub, ok }) => (
            <div key={label} className={`bg-white rounded-lg border shadow-sm p-3 flex flex-col gap-0.5 ${ok === true ? 'border-emerald-200' : ok === false ? 'border-amber-200' : 'border-gray-100'}`}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
              <p className={`text-base font-bold ${ok === true ? 'text-emerald-700' : ok === false ? 'text-amber-700' : 'text-gray-800'}`}>{value}</p>
              <p className="text-[10px] text-gray-300">{sub}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
