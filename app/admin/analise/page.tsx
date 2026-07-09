import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import AdminPeriodFilter from '../AdminPeriodFilter'
import { InfoTooltip } from '../InfoTooltip'
import { CostSection } from './CostSection'
import { Suspense } from 'react'
import { brtCutoff } from '@/lib/brt'

export const dynamic = 'force-dynamic'

interface IntencaoRow   { intencao_detectada: string | null; total: number }
interface StarterRow    { starter: string | null; total: number }
interface MensagemRow   { created_at: string; starter_usado: string | null; intencao_detectada: string | null; primeira_mensagem: string | null; session_id?: string | null }
interface SessionCostRow {
  session_id:    string
  total_brl:     number
  total_usd:     number
  turns:         number
  had_rec:       boolean
  first_turn_at: string
}
interface ClickRow  { session_id: string; event_type: string }
interface RacketRow { id: number; name: string; slug: string }
interface RecEventRow { racket_id: number }

const COMISSAO_ESTIMADA_BRL: number | null = null
const TAXA_CLIQUE_TO_VENDA:  number | null = null

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
function fmtUsd(v: number) { return `US$ ${v.toFixed(4)}` }
function avg(arr: number[]): number | null {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
}

export default async function AnaliseAdmin({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; starter?: string; from?: string; to?: string }>
}) {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const { days: daysParam = '1', starter: starterParam, from: fromParam, to: toParam } = await searchParams
  const cookieStore = await cookies()
  const includeTest = cookieStore.get('admin_test_view')?.value === '1'

  const daysBack: number = fromParam
    ? Math.max(1, Math.ceil((Date.now() - new Date(fromParam + 'T00:00:00').getTime()) / 86400000))
    : daysParam === 'all' ? 3650 : Math.max(1, parseInt(daysParam) || 30)

  let cutoffDate: string
  let toDate: string | null = null
  let daysLabel: string
  if (fromParam) {
    // Meia-noite BRT do dia inicial = 03:00 UTC
    const [fy, fm, fd] = fromParam.split('-').map(Number)
    cutoffDate = new Date(Date.UTC(fy, fm - 1, fd, 3, 0, 0, 0)).toISOString()
    if (toParam) {
      // Fim do dia BRT = meia-noite BRT do dia seguinte = 03:00 UTC do dia seguinte
      const [ty, tm, td] = toParam.split('-').map(Number)
      toDate = new Date(Date.UTC(ty, tm - 1, td + 1, 3, 0, 0, 0)).toISOString()
    }
    daysLabel = `${fromParam} → ${toParam ?? 'hoje'}`
  } else {
    cutoffDate = brtCutoff(daysBack)
    daysLabel  = daysParam === '1' ? 'hoje' : daysParam === 'all' ? 'todos os tempos' : `últimos ${daysParam} dias`
  }
  const filterStarter = starterParam !== undefined ? decodeURIComponent(starterParam) : null

  const sb  = getAdmin()
  const now = Date.now()
  const ago7 = new Date(now -  7 * 24 * 60 * 60 * 1000).toISOString()
  const ago1 = new Date(now -  1 * 24 * 60 * 60 * 1000).toISOString()

  const supabaseUrl    = process.env.SUPABASE_URL ?? ''
  const supabaseDomain = supabaseUrl.replace('https://', '').replace(/\/$/, '')

  const columnCheck = await sb.from('conversations').select('primeira_mensagem').limit(1)
    .then(r => ({ ok: !r.error, errorMsg: r.error?.message ?? null }))
  const primeiraMsgColumnMissing = !columnCheck.ok

  const [
    sessionCostRows,
    clickRows,
    recEventRows,
    intentRaw,
    starterRaw,
    starterDetailRows,
  ] = await Promise.all([
    sb.rpc('admin_cost_by_session', {
      cutoff_at: cutoffDate,
      p_include_test: includeTest,
      ...(toDate ? { to_at: toDate } : {}),
    }).then(r => (r.data ?? []) as SessionCostRow[]),

    (() => {
      const q = sb.from('feedback_events')
        .select('session_id, event_type')
        .in('event_type', ['ver_na_loja', 'ver_analise'])
        .gte('created_at', cutoffDate)
      return (includeTest ? q : q.eq('is_test', false)).then(r => (r.data ?? []) as ClickRow[])
    })(),

    (() => {
      const q = sb.from('recommendation_events')
        .select('racket_id')
        .gte('created_at', cutoffDate)
      return (includeTest ? q : q.eq('is_test', false)).then(r => (r.data ?? []) as RecEventRow[])
    })(),

    // Intenções filtradas pelo período — 1 contagem por session_id
    (() => {
      const q = sb.from('conversations')
        .select('session_id, intencao_detectada')
        .not('intencao_detectada', 'is', null)
        .gte('created_at', cutoffDate)
      return (includeTest ? q : q.eq('is_test', false)).then(r => {
        const seen = new Set<string>()
        const c: Record<string, number> = {}
        for (const row of (r.data ?? []) as { session_id: string; intencao_detectada: string }[]) {
          if (seen.has(row.session_id)) continue
          seen.add(row.session_id)
          c[row.intencao_detectada] = (c[row.intencao_detectada] ?? 0) + 1
        }
        return Object.entries(c).map(([k, v]) => ({ intencao_detectada: k, total: v })).sort((a, b) => b.total - a.total)
      })
    })(),

    // Starters filtrados pelo período — 1 contagem por session_id
    (() => {
      const q = sb.from('conversations')
        .select('session_id, starter_usado')
        .not('primeira_mensagem', 'is', null)
        .gte('created_at', cutoffDate)
      return (includeTest ? q : q.eq('is_test', false)).then(r => {
        // Deduplica: 1 entrada por sessão, priorizando a row com starter_usado preenchido
        const sessionMap = new Map<string, string | null>()
        for (const row of (r.data ?? []) as { session_id: string; starter_usado: string | null }[]) {
          const prev = sessionMap.get(row.session_id)
          if (prev === undefined || (prev === null && row.starter_usado !== null))
            sessionMap.set(row.session_id, row.starter_usado)
        }
        const c: Record<string, number> = {}
        for (const starter of sessionMap.values()) {
          const k = starter ?? 'livre'
          c[k] = (c[k] ?? 0) + 1
        }
        return Object.entries(c).map(([k, v]) => ({ starter: k === 'livre' ? null : k, total: v })).sort((a, b) => b.total - a.total)
      })
    })(),

    filterStarter === null || primeiraMsgColumnMissing
      ? Promise.resolve([] as MensagemRow[])
      : (() => {
          const base = sb.from('conversations')
            .select('created_at, primeira_mensagem, intencao_detectada, starter_usado')
            .not('primeira_mensagem', 'is', null)
            .gte('created_at', cutoffDate)
            .order('created_at', { ascending: false })
            .limit(100)
          const withIsTest = includeTest ? base : base.eq('is_test', false)
          return (filterStarter === 'livre'
            ? withIsTest.is('starter_usado', null)
            : withIsTest.eq('starter_usado', filterStarter)
          ).then(r => (r.data ?? []) as MensagemRow[])
        })(),

  ])

  const intencoes: IntencaoRow[] = intentRaw
  const starters: StarterRow[]   = starterRaw

  // ── Cost stats ────────────────────────────────────────────────────────────
  const sessions          = sessionCostRows.filter(r => r.total_brl > 0)
  const sessions7         = sessions.filter(r => r.first_turn_at >= ago7)
  const sessions1         = sessions.filter(r => r.first_turn_at >= ago1)
  const sessionsWithRec   = sessions.filter(r => r.had_rec)
  const clickSessionIds   = new Set(clickRows.map(r => r.session_id))
  const affiliateClicks   = clickRows.filter(r => r.event_type === 'ver_na_loja')
  const sessionsWithClick = sessions.filter(r => clickSessionIds.has(r.session_id))

  const avgBrl      = avg(sessions.map(r => r.total_brl))
  const avg7Brl     = avg(sessions7.map(r => r.total_brl))
  const avg1Brl     = avg(sessions1.map(r => r.total_brl))
  const avgUsd      = avg(sessions.map(r => r.total_usd))
  const avg7Usd     = avg(sessions7.map(r => r.total_usd))
  const avg1Usd     = avg(sessions1.map(r => r.total_usd))
  const totalBrl    = sessions.reduce((a, r) => a + r.total_brl, 0)
  const total7Brl   = sessions7.reduce((a, r) => a + r.total_brl, 0)
  const totalUsd    = sessions.reduce((a, r) => a + r.total_usd, 0)
  const total7Usd   = sessions7.reduce((a, r) => a + r.total_usd, 0)
  const maxCost     = sessions.length > 0 ? Math.max(...sessions.map(r => r.total_brl)) : null
  const avgTurns    = avg(sessions.map(r => r.turns))
  const avgCostTurn = avgBrl != null && avgTurns != null && avgTurns > 0 ? avgBrl / avgTurns : null
  const taxaConversao     = sessions.length > 0 ? sessionsWithClick.length / sessions.length : 0
  const taxaRec           = sessions.length > 0 ? sessionsWithRec.length / sessions.length : null
  const custoPorClique    = affiliateClicks.length > 0 ? totalBrl / affiliateClicks.length : null
  const pontoEquilibrio   = COMISSAO_ESTIMADA_BRL != null && avgBrl != null && avgBrl > 0
    ? Math.round(COMISSAO_ESTIMADA_BRL / avgBrl) : null
  const receitaEstimadaConv = COMISSAO_ESTIMADA_BRL != null && TAXA_CLIQUE_TO_VENDA != null
    ? COMISSAO_ESTIMADA_BRL * taxaConversao * TAXA_CLIQUE_TO_VENDA : null
  const isAboveEquilibrio = receitaEstimadaConv != null && avgBrl != null
    ? receitaEstimadaConv >= avgBrl : null

  // ── Top raquetes recomendadas ─────────────────────────────────────────────
  const racketCounts: Record<number, number> = {}
  for (const e of recEventRows) racketCounts[e.racket_id] = (racketCounts[e.racket_id] ?? 0) + 1
  const topRacketIds = Object.entries(racketCounts).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 10).map(([id]) => Number(id))
  const racketNames: RacketRow[] = topRacketIds.length
    ? await sb.from('rackets').select('id, name, slug').in('id', topRacketIds).then(r => (r.data ?? []) as RacketRow[])
    : []
  const topRaquetes = topRacketIds.map(id => ({
    id,
    name: racketNames.find(r => r.id === id)?.name ?? `ID ${id}`,
    slug: racketNames.find(r => r.id === id)?.slug ?? null,
    count: racketCounts[id] ?? 0,
  }))

  // ── Insights ──────────────────────────────────────────────────────────────
  type Insight = { level: 'ok' | 'warn' | 'info' | 'neutral'; text: string }
  const insights: Insight[] = []
  const MIN_DATA  = 5
  const totalConv = sessions.length

  if (primeiraMsgColumnMissing) {
    insights.push({ level: 'warn', text: `Coluna primeira_mensagem ausente (${supabaseDomain}). Execute a migration abaixo para habilitar análise de mensagens.` })
  }
  if (totalConv < MIN_DATA) {
    insights.push({ level: 'neutral', text: `Apenas ${totalConv} conversa${totalConv !== 1 ? 's' : ''} com custo no período — ainda poucos dados para tendências.` })
  } else {
    const totalInt = intencoes.reduce((a, r) => a + r.total, 0)
    const topIntent = intencoes[0] ?? null
    if (topIntent && totalInt > 0) {
      insights.push({ level: 'info', text: `"${topIntent.intencao_detectada}" é a intenção #1 (${pct(topIntent.total, totalInt)} das conversas). Vale priorizar esse fluxo no copy e starters.` })
    }
    if (taxaRec !== null) {
      insights.push({ level: taxaRec >= 0.5 ? 'ok' : 'warn', text: `${pct(sessionsWithRec.length, totalConv)} das conversas chegaram a uma recomendação (${daysLabel}).${taxaRec < 0.5 ? ' Abaixo de 50% — verificar abandono ou dificuldade de qualificação.' : ''}` })
    }
    if (sessions.length >= MIN_DATA) {
      insights.push({ level: taxaConversao >= 0.08 ? 'ok' : 'warn', text: `${pct(sessionsWithClick.length, totalConv)} clicaram em loja ou análise (${daysLabel}).${taxaConversao < 0.08 ? ' Abaixo de 8% — verificar links de afiliado.' : ''}` })
    }
    if (avgBrl != null && avgTurns != null) {
      insights.push({ level: 'neutral', text: `Custo médio ${fmtBrl(avgBrl, 4)}/conversa · ${avgTurns.toFixed(1)} turnos/sessão (${daysLabel}).${avgTurns > 6 ? ' Muitos turnos — agente pode estar demorando para qualificar.' : ''}` })
    }
    if (avg7Brl != null && avgBrl != null && sessions7.length >= 3 && sessions.length >= 10) {
      const diff = avg7Brl - avgBrl
      if (Math.abs(diff) / avgBrl > 0.2) {
        insights.push({ level: diff > 0 ? 'warn' : 'ok', text: `Custo médio nos últimos 7 dias (${fmtBrl(avg7Brl, 4)}) está ${diff > 0 ? '+' : ''}${Math.round((diff / avgBrl) * 100)}% vs o período.${diff > 0 ? ' Verificar mudança no fluxo.' : ' Tendência de redução.'}` })
      }
    }
  }

  const insightIcon: Record<Insight['level'], string> = { ok: '✅', warn: '⚠️', info: '💡', neutral: '📊' }
  const insightBg: Record<Insight['level'], string> = {
    ok: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warn: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    neutral: 'bg-gray-50 border-gray-200 text-gray-700',
  }

  // ── URL helpers ──────────────────────────────────────────────────────────
  const starterDetailHref = (s: string | null) => {
    const p = new URLSearchParams()
    if (daysParam !== '30') p.set('days', daysParam)
    p.set('starter', s ?? 'livre')
    return `?${p.toString()}`
  }
  const backHref = (() => {
    const p = new URLSearchParams()
    if (daysParam !== '30') p.set('days', daysParam)
    return p.toString() ? `?${p.toString()}` : '?'
  })()

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-800">Análise</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">{daysLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <AdminPeriodFilter current={fromParam ? '' : daysParam} currentFrom={fromParam} currentTo={toParam} />
          </Suspense>
        </div>
      </div>

      {/* Migration notice */}
      {primeiraMsgColumnMissing && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs flex flex-col gap-2">
          <p className="font-semibold text-amber-800">
            ⚠️ Coluna <code className="font-mono bg-amber-100 px-1 rounded">primeira_mensagem</code> ausente
            {supabaseDomain && <span className="font-normal text-amber-600 ml-2">— {supabaseDomain}</span>}
          </p>
          {columnCheck.errorMsg && <p className="text-amber-700 font-mono bg-amber-100 px-2 py-1 rounded">{columnCheck.errorMsg}</p>}
          <pre className="bg-amber-100 rounded px-3 py-2 font-mono text-amber-900 overflow-x-auto whitespace-pre-wrap">{`ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS primeira_mensagem TEXT,
  ADD COLUMN IF NOT EXISTS starter_usado TEXT,
  ADD COLUMN IF NOT EXISTS intencao_detectada TEXT;`}</pre>
        </div>
      )}

      {/* ── Insights ── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
          Insights <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">— {daysLabel}</span>
        </h2>
        <div className="flex flex-col gap-2">
          {insights.map((ins, i) => (
            <div key={i} className={`rounded-xl border px-4 py-3 text-sm flex gap-3 items-start ${insightBg[ins.level]}`}>
              <span className="text-base shrink-0 mt-px">{insightIcon[ins.level]}</span>
              <p className="leading-snug">{ins.text}</p>
            </div>
          ))}
          {insights.length === 0 && <p className="text-gray-400 italic text-xs">Nenhum dado disponível.</p>}
        </div>
      </section>

      {/* ── Sessões ── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">
          Sessões <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">— {daysLabel}</span>
        </h2>
        <p className="text-[11px] text-gray-400 mb-3">Usuários que iniciaram o quiz · cada sessão = 1 browser</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {([
            { label: 'Total de sessões', value: String(totalConv), sub: 'com quiz (custo > 0)', ok: null as boolean | null, tip: 'Sessões que geraram pelo menos uma chamada de API (quiz iniciado). Não inclui visitantes que apenas navegaram pelas páginas de raquete.' },
            { label: 'Turnos médios/sessão', value: avgTurns != null ? avgTurns.toFixed(1) : '—', sub: avgTurns != null && avgTurns > 6 ? '⚠ acima do esperado' : 'ok', ok: avgTurns != null ? avgTurns <= 6 : null, tip: 'Chamadas de API por sessão com custo > 0. A maioria resolve em 1 turno (starter → recomendação em uma chamada). Acima de 6 sugere dificuldade de qualificação.' },
            { label: 'Com recomendação', value: taxaRec !== null ? pct(sessionsWithRec.length, totalConv) : '—', sub: `${sessionsWithRec.length} de ${totalConv} sessões`, ok: taxaRec !== null && taxaRec >= 0.5, tip: 'Sessões que chegaram a ter pelo menos 1 raquete recomendada pelo modelo. Verde ≥ 50%.' },
          ] as { label: string; value: string; sub: string; ok: boolean | null; tip: string }[]).map(({ label, value, sub, ok, tip }) => (
            <div key={label} className={`bg-white rounded-lg border shadow-sm p-3 flex flex-col gap-0.5 ${ok === true ? 'border-emerald-200' : ok === false ? 'border-amber-200' : 'border-gray-100'}`}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight flex items-center gap-0.5">{label}<InfoTooltip text={tip} /></p>
              <p className={`text-base font-bold ${ok === true ? 'text-emerald-700' : ok === false ? 'text-amber-700' : 'text-gray-800'}`}>{value}</p>
              <p className="text-[10px] text-gray-300">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cliques via quiz ── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">
          Cliques via quiz <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">— {daysLabel}</span>
        </h2>
        <p className="text-[11px] text-gray-400 mb-3">
          Fonte: <code className="font-mono">feedback_events</code> · apenas sessões que passaram pelo quiz ·{' '}
          <a href="/admin/cliques" className="underline hover:text-gray-600">cliques diretos (sem quiz) → aba Cliques</a>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {([
            { label: 'Sessões que clicaram', value: pct(sessionsWithClick.length, sessions.length), sub: `${sessionsWithClick.length} de ${sessions.length} sessões`, ok: taxaConversao >= 0.08, tip: 'Sessões com quiz que tiveram pelo menos um clique em "Ver na loja" ou "Ver análise". Verde ≥ 8%.' },
            { label: '"Ver na loja"', value: String(affiliateClicks.length), sub: 'afiliado ML (feedback_events)', ok: null as boolean | null, tip: 'Cliques no botão "Ver na loja" dentro do quiz. Registrado no frontend via feedback_events. Pode diferir de link_clicks se o usuário não completou o redirect.' },
            { label: '"Ver análise"', value: String(clickRows.filter(r => r.event_type === 'ver_analise').length), sub: 'página da raquete', ok: null as boolean | null, tip: 'Cliques em "Ver análise" — leva à página de detalhes da raquete. Registrado no frontend via feedback_events.' },
          ] as { label: string; value: string; sub: string; ok: boolean | null; tip: string }[]).map(({ label, value, sub, ok, tip }) => (
            <div key={label} className={`bg-white rounded-lg border shadow-sm p-3 flex flex-col gap-0.5 ${ok === true ? 'border-emerald-200' : ok === false ? 'border-amber-200' : 'border-gray-100'}`}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight flex items-center gap-0.5">{label}<InfoTooltip text={tip} /></p>
              <p className={`text-base font-bold ${ok === true ? 'text-emerald-700' : ok === false ? 'text-amber-700' : 'text-gray-800'}`}>{value}</p>
              <p className="text-[10px] text-gray-300">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Custos + Rentabilidade ── */}
      <CostSection
        avgBrl={avgBrl}
        avgUsd={avgUsd}
        totalBrl={totalBrl}
        totalUsd={totalUsd}
        maxCostBrl={maxCost}
        maxCostUsd={sessions.length > 0 ? Math.max(...sessions.map(r => r.total_usd)) : null}
        avgCostTurnBrl={avgCostTurn}
        avgCostTurnUsd={avgUsd != null && avgTurns != null && avgTurns > 0 ? avgUsd / avgTurns : null}
        custoPorCliqueBrl={custoPorClique}
        custoPorCliqueUsd={affiliateClicks.length > 0 ? totalUsd / affiliateClicks.length : null}
        affiliateClicksCount={affiliateClicks.length}
        sessionsCount={sessions.length}
        sessionsWithRecCount={sessionsWithRec.length}
        sessionsWithClickCount={sessionsWithClick.length}
        avgTurns={avgTurns}
        taxaConversao={taxaConversao}
      />

      {/* ── Recomendações ── */}
      {topRaquetes.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">
            Recomendações <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">— {daysLabel}</span>
          </h2>
          <p className="text-[11px] text-gray-400 mb-3">Fonte: <code className="font-mono">recommendation_events</code> · 1 linha por raquete sugerida pelo modelo</p>
          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-50 text-gray-400 uppercase">
                <tr>
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">Raquete</th>
                  <th className="text-right px-4 py-2">Recomendações</th>
                  <th className="text-right px-4 py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {topRaquetes.map((r, i) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {r.slug
                        ? <a href={`/raquetes/${r.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 hover:underline">{r.name}</a>
                        : r.name}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">{r.count}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{pct(r.count, recEventRows.length)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-gray-300 px-4 py-2">{recEventRows.length} recomendações totais no período</p>
          </div>
        </section>
      )}

      {/* ── Starters ── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">Starters usados</h2>
        <p className="text-[11px] text-gray-400 mb-3">{daysLabel} · clique para ver as primeiras mensagens</p>
        {starters.length === 0 ? (
          <p className="text-gray-400 italic text-xs">Sem dados ainda.</p>
        ) : (
          <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden text-xs">
            <thead className="bg-gray-50 text-gray-400 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Starter</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-right px-4 py-2">%</th>
                <th className="px-4 py-2 w-1/3"></th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {starters.filter(r => r.starter !== null).map(r => {
                const total    = starters.reduce((a, x) => a + x.total, 0)
                const isActive = filterStarter !== null && filterStarter === (r.starter ?? 'livre')
                return (
                  <tr key={r.starter ?? 'livre'} className={`border-t border-gray-100 ${isActive ? 'bg-teal-50' : ''}`}>
                    <td className="px-4 py-2">{r.starter ?? <span className="italic text-gray-400">livre (digitou)</span>}</td>
                    <td className="px-4 py-2 text-right font-semibold">{r.total}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{pct(r.total, total)}</td>
                    <td className="px-4 py-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-300 rounded-full" style={{ width: `${Math.round((r.total / total) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {primeiraMsgColumnMissing ? (
                        <span className="text-gray-300 text-[10px]">migration pendente</span>
                      ) : (
                        <Link href={starterDetailHref(r.starter)} className={`px-2.5 py-1 rounded-full font-medium transition-colors ${isActive ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-teal-100 hover:text-teal-700'}`}>
                          {isActive ? 'Aberto ↓' : 'Ver mensagens'}
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Detalhe de starter ── */}
      {filterStarter !== null && !primeiraMsgColumnMissing && (
        <section className="border-2 border-teal-200 rounded-2xl p-5 bg-teal-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-teal-900">
                Mensagens: <span className="font-normal italic">&ldquo;{filterStarter === 'livre' ? 'livre (digitou)' : filterStarter}&rdquo;</span>
              </h2>
              <p className="text-teal-600 text-xs mt-0.5">
                {starterDetailRows.length} mensagem{starterDetailRows.length !== 1 ? 's' : ''}
                {filterStarter === 'livre' && ' — texto original, sem edição'}
              </p>
            </div>
            <Link href={backHref} className="text-xs text-teal-600 hover:text-teal-800 border border-teal-300 rounded-lg px-3 py-1.5 transition-colors bg-white">
              ← Fechar
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {starterDetailRows.map((r, i) => (
              <div key={i} className="bg-white rounded-lg px-4 py-3 border border-teal-100 shadow-sm">
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-1 flex-wrap">
                  <span>{new Date(r.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                  {r.intencao_detectada && <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">{r.intencao_detectada}</span>}
                </div>
                <p className="text-gray-800 leading-snug text-sm">{r.primeira_mensagem}</p>
              </div>
            ))}
            {starterDetailRows.length === 0 && <p className="text-teal-600 italic text-sm">Nenhuma mensagem encontrada.</p>}
          </div>
        </section>
      )}

      {/* ── Glossário de dados ── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
          Mapa de dados
        </h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 text-xs">

          {/* Session */}
          <div className="px-5 py-4 flex gap-4">
            <span className="shrink-0 w-28 font-semibold text-gray-700 pt-0.5">Sessão</span>
            <div className="flex flex-col gap-1 text-gray-500">
              <p>Identificador de browser (<code className="bg-gray-100 px-1 rounded text-[11px]">session_id</code>). Criado quando o usuário abre o site pela primeira vez — <strong>não depende de iniciar o quiz</strong>. Quem acessa <code>/raquetes/athena</code> diretamente já tem uma sessão.</p>
              <p className="text-[11px] text-gray-400">Tabela: <code>conversations.session_id</code>, <code>link_clicks.session_id</code>, <code>feedback_events.session_id</code></p>
            </div>
          </div>

          {/* Conversa */}
          <div className="px-5 py-4 flex gap-4">
            <span className="shrink-0 w-28 font-semibold text-gray-700 pt-0.5">Conversa</span>
            <div className="flex flex-col gap-1 text-gray-500">
              <p>Uma chamada de API ao Claude (<code>custo_brl &gt; 0</code>). Uma sessão de quiz pode gerar 1–N conversas conforme o usuário continua interagindo. O contador de <strong>Turnos</strong> no painel = total de linhas com custo &gt; 0 por sessão.</p>
              <p className="text-[11px] text-gray-400">Tabela: <code>conversations</code> · 1 linha por chamada de API. Turnos médios tipicamente entre 1–3 (maioria resolve em 1 chamada).</p>
            </div>
          </div>

          {/* Recomendação */}
          <div className="px-5 py-4 flex gap-4">
            <span className="shrink-0 w-28 font-semibold text-gray-700 pt-0.5">Recomendação</span>
            <div className="flex flex-col gap-1 text-gray-500">
              <p>Quando o modelo retorna raquetes sugeridas (<code>recommended_racket_ids</code> não-vazio). Uma sessão tem <code>had_rec = true</code> se qualquer turno gerou recomendações. A <strong>taxa de recomendação</strong> mede sessões com quiz que chegaram a ter pelo menos 1 recomendação.</p>
              <p className="text-[11px] text-gray-400">Tabela: <code>recommendation_events</code> (1 linha por raquete recomendada)</p>
            </div>
          </div>

          {/* Clique via quiz */}
          <div className="px-5 py-4 flex gap-4">
            <span className="shrink-0 w-28 font-semibold text-teal-700 pt-0.5">Clique quiz</span>
            <div className="flex flex-col gap-1 text-gray-500">
              <p>Evento registrado pelo <strong>frontend</strong> quando o usuário clica em um botão dentro da interface do quiz. Tipos: <code className="bg-gray-100 px-1 rounded text-[11px]">ver_na_loja</code> (afiliado), <code className="bg-gray-100 px-1 rounded text-[11px]">ver_analise</code> (página da raquete), <code className="bg-gray-100 px-1 rounded text-[11px]">nova_conversa_pos_rec</code>.</p>
              <p className="text-[11px] text-gray-400">Tabela: <code>feedback_events</code> · usado para calcular "Cliques Ver na loja" e "sessões que clicaram" no painel.</p>
            </div>
          </div>

          {/* Clique no link */}
          <div className="px-5 py-4 flex gap-4">
            <span className="shrink-0 w-28 font-semibold text-amber-700 pt-0.5">Clique link</span>
            <div className="flex flex-col gap-1 text-gray-500">
              <p>Registrado <strong>server-side</strong> ao passar pelo redirect <code>/ir/[slug]</code>. Captura <em>todos</em> os cliques — com ou sem sessão de quiz. Inclui cliques diretos de quem acessa a página da raquete sem ter feito o quiz. Tem <code>tipo</code> (afiliado / busca ML / oficial) e URL de destino.</p>
              <p className="text-[11px] text-gray-400">Tabela: <code>link_clicks</code> · usado no painel <strong>Cliques</strong>. Ver aba Cliques para breakdown por raquete.</p>
            </div>
          </div>

          {/* Diferença */}
          <div className="px-5 py-4 bg-gray-100 rounded-b-xl">
            <p className="font-semibold text-gray-700 mb-1.5">Diferença entre as duas fontes de clique</p>
            <div className="text-gray-500 flex flex-col gap-1">
              <p>Um clique vindo do quiz aparece em <strong>ambas</strong> as tabelas: <code>feedback_events</code> (botão pressionado) + <code>link_clicks</code> (passou pelo redirect). Um clique direto (usuário vai à página da raquete sem quiz) aparece <strong>só em <code>link_clicks</code></strong> — sem <code>session_id</code> na conversa.</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Por isso o painel Dados mostra 3 "Ver na loja" (só quiz) enquanto o painel Cliques mostra 7 (todos, incluindo 3 sem sessão de hoje).</p>
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}
