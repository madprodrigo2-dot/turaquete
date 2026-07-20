import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import AdminPeriodFilter from '../AdminPeriodFilter'
import { InfoTooltip } from '../InfoTooltip'
import { CostSection } from './CostSection'
import { EvolucaoSection, type EvolucaoPoint } from './EvolucaoSection'
import { Suspense } from 'react'
import { brtCutoff } from '@/lib/brt'
import { SEARCH_FALLBACK_UNCOVERED } from '@/lib/ml-search'

export const dynamic = 'force-dynamic'

interface IntencaoRow    { intencao_detectada: string | null; total: number }
interface StarterRow     { starter: string | null; total: number }
interface MensagemRow    { created_at: string; starter_usado: string | null; intencao_detectada: string | null; primeira_mensagem: string | null; session_id?: string | null }
interface SessionCostRow { session_id: string; total_brl: number; total_usd: number; turns: number; had_rec: boolean; first_turn_at: string }
interface ClickRow       { session_id: string; event_type: string; racket_id: number | null }
interface RecEventRow    { racket_id: number; conversation_id: string }
interface RacketRow      { id: number; name: string; slug: string }

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
    const [fy, fm, fd] = fromParam.split('-').map(Number)
    cutoffDate = new Date(Date.UTC(fy, fm - 1, fd, 3, 0, 0, 0)).toISOString()
    if (toParam) {
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
    linkClickCounts,
    fallbackRows,
    opsStats,
  ] = await Promise.all([

    sb.rpc('admin_cost_by_session', {
      cutoff_at: cutoffDate,
      p_include_test: includeTest,
      ...(toDate ? { to_at: toDate } : {}),
    }).then(r => (r.data ?? []) as SessionCostRow[]),

    (() => {
      const q = sb.from('feedback_events')
        .select('session_id, event_type, racket_id')
        .in('event_type', ['ver_na_loja', 'ver_analise'])
        .gte('created_at', cutoffDate)
      return (includeTest ? q : q.eq('is_test', false)).then(r => (r.data ?? []) as ClickRow[])
    })(),

    (() => {
      const q = sb.from('recommendation_events')
        .select('racket_id, conversation_id')
        .gte('created_at', cutoffDate)
      return (includeTest ? q : q.eq('is_test', false)).then(r => (r.data ?? []) as RecEventRow[])
    })(),

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

    (() => {
      const q = sb.from('conversations')
        .select('session_id, starter_usado')
        .not('primeira_mensagem', 'is', null)
        .gte('created_at', cutoffDate)
      return (includeTest ? q : q.eq('is_test', false)).then(r => {
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

    // link_clicks por tipo no período — só cliques do site (session_id presente)
    (() => {
      let q = sb.from('link_clicks')
        .select('tipo')
        .eq('is_test', false)
        .not('session_id', 'is', null)
        .gte('created_at', cutoffDate)
      if (toDate) q = q.lte('created_at', toDate)
      return q.then(r => {
        const rows = (r.data ?? []) as { tipo: string }[]
        const c: Record<string, number> = { afiliado: 0, busca: 0, oficial: 0 }
        for (const row of rows) c[row.tipo] = (c[row.tipo] ?? 0) + 1
        return c
      })
    })(),

    // Raquetes publicadas em fallback (is_active=false + tem affiliate_url)
    sb.from('rackets')
      .select('name')
      .eq('publicada', true)
      .not('affiliate_url', 'is', null)
      .eq('is_active', false)
      .order('name')
      .then(r => (r.data ?? []) as { name: string }[]),

    // Sem cobertura + última sync
    Promise.all([
      sb.from('rackets')
        .select('id', { count: 'exact', head: true })
        .eq('publicada', true)
        .is('affiliate_url', null),
      sb.from('rackets')
        .select('price_updated_at')
        .not('affiliate_url', 'is', null)
        .order('price_updated_at', { ascending: false })
        .limit(1),
    ]).then(([semRes, syncRes]) => ({
      sem_cobertura: semRes.count ?? 0,
      ultima_sync: (syncRes.data?.[0]?.price_updated_at as string | null) ?? null,
    })),

  ])

  // ── Evolução — 180 dias independente do filtro de período ────────────────
  function toBrtDate(iso: string): string {
    return new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  }
  const evolCutoff = new Date(now - 181 * 24 * 60 * 60 * 1000).toISOString()
  const [evolConvRows, evolRecRows, evolClickRows] = await Promise.all([
    (() => {
      const q = sb.from('conversations')
        .select('created_at, session_id')
        .gt('custo_brl', 0)
        .gte('created_at', evolCutoff)
      return (includeTest ? q : q.eq('is_test', false))
        .then(r => (r.data ?? []) as { created_at: string; session_id: string }[])
    })(),
    (() => {
      const q = sb.from('recommendation_events')
        .select('created_at, conversation_id')
        .gte('created_at', evolCutoff)
      return (includeTest ? q : q.eq('is_test', false))
        .then(r => (r.data ?? []) as { created_at: string; conversation_id: string }[])
    })(),
    sb.from('link_clicks')
      .select('created_at')
      .eq('is_test', false)
      .not('session_id', 'is', null)
      .in('tipo', ['afiliado', 'busca'])
      .gte('created_at', evolCutoff)
      .then(r => (r.data ?? []) as { created_at: string }[]),
  ])

  // Agregar por dia BRT
  const convByDay = new Map<string, Set<string>>()
  for (const r of evolConvRows) {
    const d = toBrtDate(r.created_at)
    if (!convByDay.has(d)) convByDay.set(d, new Set())
    convByDay.get(d)!.add(r.session_id)
  }
  const recByDay = new Map<string, Set<string>>()
  for (const r of evolRecRows) {
    const d = toBrtDate(r.created_at)
    if (!recByDay.has(d)) recByDay.set(d, new Set())
    recByDay.get(d)!.add(r.conversation_id)
  }
  const clicksByDay = new Map<string, number>()
  for (const r of evolClickRows) {
    const d = toBrtDate(r.created_at)
    clicksByDay.set(d, (clicksByDay.get(d) ?? 0) + 1)
  }

  // Gerar array de 180 dias (hoje incluído)
  const todayBrt   = toBrtDate(new Date(now).toISOString())
  const evolRawData: EvolucaoPoint[] = []
  for (let i = 179; i >= 0; i--) {
    const dayMs = new Date(todayBrt + 'T12:00:00Z').getTime() - i * 86400000
    const day   = new Date(dayMs).toISOString().slice(0, 10)
    evolRawData.push({
      date:          day,
      conversas:     convByDay.get(day)?.size    ?? 0,
      recomendacoes: recByDay.get(day)?.size     ?? 0,
      cliques:       clicksByDay.get(day)        ?? 0,
    })
  }

  const intencoes: IntencaoRow[] = intentRaw
  const starters: StarterRow[]   = starterRaw

  // ── Cost stats ────────────────────────────────────────────────────────────
  const sessions            = sessionCostRows.filter(r => r.total_brl > 0)
  const sessions7           = sessions.filter(r => r.first_turn_at >= ago7)
  const lojaClickRows       = clickRows.filter(r => r.event_type === 'ver_na_loja')
  const analiseClickRows    = clickRows.filter(r => r.event_type === 'ver_analise')
  const lojaSessionIds      = new Set(lojaClickRows.map(r => r.session_id))
  const analiseSessionIds   = new Set(analiseClickRows.map(r => r.session_id))
  const sessionsWithRec     = sessions.filter(r => r.had_rec)
  const sessionsWithLoja    = sessions.filter(r => lojaSessionIds.has(r.session_id))
  const sessionsWithAnalise = sessions.filter(r => analiseSessionIds.has(r.session_id))

  const avgBrl      = avg(sessions.map(r => r.total_brl))
  const avg7Brl     = avg(sessions7.map(r => r.total_brl))
  const avgUsd      = avg(sessions.map(r => r.total_usd))
  const totalBrl    = sessions.reduce((a, r) => a + r.total_brl, 0)
  const totalUsd    = sessions.reduce((a, r) => a + r.total_usd, 0)
  const maxCost     = sessions.length > 0 ? Math.max(...sessions.map(r => r.total_brl)) : null
  const avgTurns    = avg(sessions.map(r => r.turns))
  const avgCostTurn = avgBrl != null && avgTurns != null && avgTurns > 0 ? avgBrl / avgTurns : null
  const taxaLoja    = sessionsWithRec.length > 0 ? sessionsWithLoja.length / sessionsWithRec.length : 0
  const taxaRec     = sessions.length > 0 ? sessionsWithRec.length / sessions.length : null

  // ── link_clicks (fonte de verdade para dinheiro) ──────────────────────────
  const lcAfiliado = linkClickCounts['afiliado'] ?? 0
  const lcBusca    = linkClickCounts['busca']    ?? 0
  const lcOficial  = linkClickCounts['oficial']  ?? 0
  const lcTotal    = lcAfiliado + lcBusca + lcOficial
  const lcMonetizavel = lcAfiliado + lcBusca
  const custoPorClique = lcMonetizavel > 0 ? totalBrl / lcMonetizavel : null
  const custoPorCliqueUsd = lcMonetizavel > 0 ? totalUsd / lcMonetizavel : null

  // ── % clicou por raquete (join rec_events ↔ feedback_events por session+racket) ──
  const recByRacket: Record<number, Set<string>> = {}
  for (const e of recEventRows) {
    if (!recByRacket[e.racket_id]) recByRacket[e.racket_id] = new Set()
    recByRacket[e.racket_id].add(e.conversation_id)
  }
  const clickByRacket: Record<number, Set<string>> = {}
  for (const e of clickRows) {
    if (e.racket_id == null) continue
    if (!clickByRacket[e.racket_id]) clickByRacket[e.racket_id] = new Set()
    clickByRacket[e.racket_id].add(e.session_id)
  }

  // ── Top raquetes recomendadas ─────────────────────────────────────────────
  const racketCounts: Record<number, number> = {}
  for (const e of recEventRows) racketCounts[e.racket_id] = (racketCounts[e.racket_id] ?? 0) + 1
  const topRacketIds = Object.entries(racketCounts).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 10).map(([id]) => Number(id))
  const racketNames: RacketRow[] = topRacketIds.length
    ? await sb.from('rackets').select('id, name, slug').in('id', topRacketIds).then(r => (r.data ?? []) as RacketRow[])
    : []
  const topRaquetes = topRacketIds.map(id => {
    const recSessions = recByRacket[id] ?? new Set<string>()
    const clickSessions = clickByRacket[id] ?? new Set<string>()
    const intersect = [...recSessions].filter(sid => clickSessions.has(sid)).length
    return {
      id,
      name: racketNames.find(r => r.id === id)?.name ?? `ID ${id}`,
      slug: racketNames.find(r => r.id === id)?.slug ?? null,
      count: racketCounts[id] ?? 0,
      pctEngajou: recSessions.size > 0 ? pct(intersect, recSessions.size) : '—',
      smallSample: (racketCounts[id] ?? 0) < 5,
    }
  })

  // ── Insights ──────────────────────────────────────────────────────────────
  type Insight = { level: 'ok' | 'warn' | 'info' | 'neutral'; text: string }
  const insights: Insight[] = []
  const MIN_DATA  = 5
  const totalConv = sessions.length

  if (primeiraMsgColumnMissing) {
    insights.push({ level: 'warn', text: `Coluna primeira_mensagem ausente (${supabaseDomain}). Execute a migration abaixo para habilitar análise de mensagens.` })
  }
  if (totalConv < MIN_DATA) {
    insights.push({ level: 'neutral', text: `Apenas ${totalConv} sessão${totalConv !== 1 ? 'ões' : ''} com quiz no período — ainda poucos dados para tendências.` })
  } else {
    const totalInt = intencoes.reduce((a, r) => a + r.total, 0)
    const topIntent = intencoes[0] ?? null
    if (topIntent && totalInt > 0) {
      insights.push({ level: 'info', text: `"${topIntent.intencao_detectada}" é a intenção #1 (${pct(topIntent.total, totalInt)} das sessões). Vale priorizar esse fluxo no copy e starters.` })
    }
    if (taxaRec !== null) {
      insights.push({ level: taxaRec >= 0.5 ? 'ok' : 'warn', text: `${pct(sessionsWithRec.length, totalConv)} das sessões chegaram a uma recomendação (${daysLabel}).${taxaRec < 0.5 ? ' Abaixo de 50% — verificar abandono.' : ''}` })
    }
    if (sessionsWithRec.length > 0) {
      insights.push({ level: 'info', text: `${pct(sessionsWithAnalise.length, sessionsWithRec.length)} das sessões com recomendação abriram a análise (${daysLabel}).` })
      const lojaRate = sessionsWithRec.length > 0 ? sessionsWithLoja.length / sessionsWithRec.length : 0
      insights.push({
        level: lojaRate >= 0.3 ? 'ok' : lojaRate >= 0.1 ? 'warn' : 'warn',
        text: `${pct(sessionsWithLoja.length, sessionsWithRec.length)} das sessões com recomendação clicaram em Ver na loja (${daysLabel}).${lojaRate < 0.1 ? ' Abaixo de 10% — copy ou confiança podem melhorar.' : lojaRate < 0.3 ? ' Entre 10–29% — espaço para melhorar conversão.' : ''}`,
      })
    }
    if (lcTotal > 0) {
      insights.push({ level: lcMonetizavel > 0 ? 'ok' : 'warn', text: `${lcMonetizavel} clique${lcMonetizavel !== 1 ? 's' : ''} monetizáve${lcMonetizavel !== 1 ? 'is' : 'l'} (afiliado + busca) de ${lcTotal} total (${daysLabel}).${custoPorClique != null ? ` Custo/clique ${fmtBrl(custoPorClique, 4)}.` : ''}` })
    }
    if (avgBrl != null && avgTurns != null) {
      insights.push({ level: 'neutral', text: `Custo médio ${fmtBrl(avgBrl, 4)}/sessão · ${avgTurns.toFixed(1)} turnos (${daysLabel}).${avgTurns > 6 ? ' Muitos turnos — agente pode estar demorando para qualificar.' : ''}` })
    }
    if (avg7Brl != null && avgBrl != null && sessions7.length >= 3 && sessions.length >= 10) {
      const diff = avg7Brl - avgBrl
      if (Math.abs(diff) / avgBrl > 0.2) {
        insights.push({ level: diff > 0 ? 'warn' : 'ok', text: `Custo médio nos últimos 7 dias (${fmtBrl(avg7Brl, 4)}) está ${diff > 0 ? '+' : ''}${Math.round((diff / avgBrl) * 100)}% vs o período.${diff > 0 ? ' Verificar mudança no fluxo.' : ' Tendência de redução.'}` })
      }
    }
    if (fallbackRows.length > 0) {
      insights.push({ level: 'warn', text: `${fallbackRows.length} raquete${fallbackRows.length !== 1 ? 's' : ''} publicada${fallbackRows.length !== 1 ? 's' : ''} em fallback de busca ML (anúncio inativo). Ver Seção 4.` })
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

  // Funil steps — steps 3 e 4 mostram % vs step 2 (não encadeado entre eles)
  const funnelSteps: { label: string; n: number; eventos: number | null; vsStep: number | null }[] = [
    { label: 'Sessões com quiz',       n: sessions.length,             eventos: null,                    vsStep: null },
    { label: 'Com recomendação',       n: sessionsWithRec.length,      eventos: null,                    vsStep: null },
    { label: 'Ver análise (via quiz)', n: sessionsWithAnalise.length,  eventos: analiseClickRows.length, vsStep: 1 },
    { label: 'Ver na loja (via quiz)', n: sessionsWithLoja.length,     eventos: lojaClickRows.length,    vsStep: 1 },
  ]

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
      {insights.length > 0 && (
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
          </div>
        </section>
      )}

      {/* ══ EVOLUÇÃO ════════════════════════════════════════════════════════ */}
      <EvolucaoSection rawData={evolRawData} />

      {/* ══ SEÇÃO 1 — Saúde do negócio ══════════════════════════════════════ */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">
          Saúde do negócio <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">— {daysLabel}</span>
        </h2>
        <p className="text-[11px] text-gray-400 mb-3">
          Cliques de <code className="font-mono">link_clicks</code> — só cliques com session_id (do site, sem bots) · fonte de verdade para métricas de dinheiro
        </p>

        {/* Cliques por tipo */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-3">Cliques monetizáveis</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { emoji: '💰', label: 'Afiliado', n: lcAfiliado, color: 'text-teal-700' },
              { emoji: '🔍', label: 'Busca ML', n: lcBusca,    color: 'text-amber-600' },
              { emoji: '🔗', label: 'Oficial',  n: lcOficial,  color: 'text-gray-500' },
              { emoji: '∑',  label: 'Total',    n: lcTotal,    color: 'text-gray-800' },
            ].map(({ emoji, label, n, color }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <p className="text-[10px] text-gray-400">{emoji} {label}</p>
                <p className={`text-xl font-bold ${color}`}>{n}</p>
                {lcTotal > 0 && n < lcTotal && (
                  <p className="text-[10px] text-gray-300">{pct(n, lcTotal)}</p>
                )}
              </div>
            ))}
          </div>
          {lcTotal === 0 && (
            <p className="text-gray-400 italic text-xs mt-2">Nenhum clique registrado no período.</p>
          )}
        </div>

        {/* Cards de custo + sessões */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {([
            {
              label: 'Custo API total',
              value: fmtBrl(totalBrl, 2),
              sub: `${sessions.length} sessões com quiz`,
              ok: null as boolean | null,
              tip: 'Total gasto na API da Anthropic no período, excluindo sessões de teste.',
            },
            {
              label: 'Custo / clique monetizável',
              value: custoPorClique != null ? fmtBrl(custoPorClique, 4) : '—',
              sub: `${lcMonetizavel} clique${lcMonetizavel !== 1 ? 's' : ''} afiliado + busca (link_clicks)`,
              ok: custoPorClique != null ? custoPorClique < 0.5 : null,
              tip: 'Custo total da API ÷ cliques monetizáveis (afiliado + busca ML) de link_clicks. Só cliques com session_id (sem externos/bots). Verde < R$ 0,50/clique.',
            },
            {
              label: 'Sessões com quiz',
              value: String(sessions.length),
              sub: 'API calls com custo > 0',
              ok: null as boolean | null,
              tip: 'Sessões que efetivamente rodaram o quiz (fizeram ao menos uma chamada à API com custo). Não inclui visitantes que só navegaram.',
            },
          ] as { label: string; value: string; sub: string; ok: boolean | null; tip: string }[]).map(({ label, value, sub, ok, tip }) => (
            <div key={label} className={`bg-white rounded-lg border shadow-sm p-3 flex flex-col gap-0.5 ${ok === true ? 'border-emerald-200' : ok === false ? 'border-amber-200' : 'border-gray-100'}`}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight flex items-center gap-0.5">{label}<InfoTooltip text={tip} /></p>
              <p className={`text-base font-bold ${ok === true ? 'text-emerald-700' : ok === false ? 'text-amber-700' : 'text-gray-800'}`}>{value}</p>
              <p className="text-[10px] text-gray-300">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ SEÇÃO 2 — Funil do quiz ══════════════════════════════════════════ */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">
          Funil do quiz <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">— {daysLabel}</span>
        </h2>
        <p className="text-[11px] text-gray-400 mb-3">
          Fonte: <code className="font-mono">feedback_events</code> · apenas sessões que passaram pelo quiz
        </p>
        {sessions.length === 0 ? (
          <p className="text-gray-400 italic text-xs">Nenhuma sessão com quiz no período.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {funnelSteps.map((step, i) => {
              const refN  = step.vsStep !== null ? funnelSteps[step.vsStep].n : (funnelSteps[i - 1]?.n ?? null)
              const retencao = refN != null && refN > 0 ? Math.round((step.n / refN) * 100) : null
              const barPct   = funnelSteps[0].n > 0 ? Math.round((step.n / funnelSteps[0].n) * 100) : 0
              const isVsRec  = step.vsStep === 1
              return (
                <div key={step.label} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                  <span className="text-[11px] text-gray-400 w-5 shrink-0 text-right">{i + 1}</span>
                  <div className="w-48 shrink-0">
                    <span className="text-xs text-gray-700">{step.label}</span>
                    {step.eventos !== null && (
                      <span className="text-[10px] text-gray-300 ml-1">({step.eventos} eventos)</span>
                    )}
                  </div>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isVsRec ? 'bg-teal-400' : 'bg-teal-500'}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-5 text-right shrink-0">{step.n}</span>
                  <span className="text-[11px] w-28 shrink-0 text-right">
                    {retencao !== null ? (
                      <span className={retencao >= 70 ? 'text-emerald-600' : retencao >= 40 ? 'text-amber-600' : 'text-red-500'}>
                        {retencao}%{isVsRec ? ' de c/ rec.' : ' do anterior'}
                      </span>
                    ) : (
                      <span className="text-gray-300">{barPct}%</span>
                    )}
                  </span>
                </div>
              )
            })}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col gap-1">
              <p className="text-[11px] text-gray-500 italic">
                Ver análise = interesse (página interna). Ver na loja = intenção de compra (afiliado). Um usuário pode ir direto à loja sem abrir a análise.
              </p>
              <p className="text-[11px] text-gray-400">
                Funil pré-quiz (visitantes → quiz_start) →{' '}
                <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
                  ver no GA4
                </a>
                {' '}· evento <code className="font-mono">quiz_start</code> disponível
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ══ SEÇÃO 3 — Produto ════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-8">
        <div>
          <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">
            Produto <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">— {daysLabel}</span>
          </h2>
          <p className="text-[11px] text-gray-400 mb-3">
            Fonte: <code className="font-mono">recommendation_events</code> · % clicou = sessões que clicaram nessa raquete ÷ sessões que a receberam como recomendação
          </p>

          {topRaquetes.length === 0 ? (
            <p className="text-gray-400 italic text-xs">Nenhuma recomendação no período.</p>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-gray-50 text-gray-400 uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left px-4 py-2">Raquete</th>
                    <th className="text-right px-4 py-2">Recs</th>
                    <th className="text-right px-4 py-2">%</th>
                    <th className="text-right px-4 py-2">
                      <span className="inline-flex items-center gap-0.5 justify-end">
                        % engajou <InfoTooltip text="Sessões que abriram análise OU clicaram na loja para essa raquete específica ÷ sessões que a receberam como recomendação. Mede interesse no produto — não é conversão." />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topRaquetes.map((r, i) => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">
                        <div>
                          {r.slug
                            ? <a href={`/raquetes/${r.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 hover:underline">{r.name}</a>
                            : r.name}
                        </div>
                        {r.slug && <div className="text-[10px] text-gray-400 font-mono">{r.slug}</div>}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">{r.count}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{pct(r.count, recEventRows.length)}</td>
                      <td className="px-4 py-2 text-right">
                        {r.smallSample ? (
                          <span className="text-gray-300" title="amostra pequena (n<5)">{r.pctEngajou}</span>
                        ) : (
                          <span className="font-medium text-teal-700">{r.pctEngajou}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-gray-300 px-4 py-2">{recEventRows.length} recomendações totais no período</p>
            </div>
          )}
        </div>

        {/* Starters */}
        <div>
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
                {(() => {
                  const starterTotal = starters.reduce((a, x) => a + x.total, 0)
                  return starters.filter(r => r.starter !== null).map(r => {
                    const isActive = filterStarter !== null && filterStarter === (r.starter ?? 'livre')
                    return (
                      <tr key={r.starter ?? 'livre'} className={`border-t border-gray-100 ${isActive ? 'bg-teal-50' : ''}`}>
                        <td className="px-4 py-2">{r.starter ?? <span className="italic text-gray-400">livre (digitou)</span>}</td>
                        <td className="px-4 py-2 text-right font-semibold">{r.total}</td>
                        <td className="px-4 py-2 text-right text-gray-400">{pct(r.total, starterTotal)}</td>
                        <td className="px-4 py-2">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-300 rounded-full" style={{ width: `${Math.round((r.total / starterTotal) * 100)}%` }} />
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
                  })
                })()}
              </tbody>
            </table>
          )}
        </div>

        {/* Detalhe de starter */}
        {filterStarter !== null && !primeiraMsgColumnMissing && (
          <div className="border-2 border-teal-200 rounded-2xl p-5 bg-teal-50">
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
          </div>
        )}

        {/* Custos */}
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
          custoPorCliqueUsd={custoPorCliqueUsd}
          affiliateClicksCount={lcMonetizavel}
          sessionsCount={sessions.length}
          sessionsWithRecCount={sessionsWithRec.length}
          sessionsWithClickCount={sessionsWithLoja.length}
          avgTurns={avgTurns}
          taxaConversao={taxaLoja}
        />
      </section>

      {/* ══ SEÇÃO 4 — Operação de links ══════════════════════════════════════ */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
          Operação de links
        </h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 text-xs">

          {/* Em fallback */}
          <div className="px-5 py-4 flex items-start gap-4">
            <div className="shrink-0 w-32">
              <p className="font-semibold text-gray-700">Em fallback</p>
              <p className="text-[11px] text-gray-400 mt-0.5">busca ML ativa</p>
            </div>
            <div className="flex-1">
              {fallbackRows.length === 0 ? (
                <span className="text-emerald-600 font-medium">✓ Nenhuma — todos os afiliados ativos</span>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-amber-600 font-semibold">{fallbackRows.length} publicada{fallbackRows.length !== 1 ? 's' : ''} com anúncio inativo</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {fallbackRows.map(r => (
                      <span key={r.name} className="bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5 text-[11px]">
                        {r.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Cliques vão para busca ML em vez do anúncio direto. Atualizar via <a href="/admin/afiliados" className="underline hover:text-gray-600">Afiliados</a>.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sem affiliate_url */}
          <div className="px-5 py-4 flex items-start gap-4">
            <div className="shrink-0 w-32">
              <p className="font-semibold text-gray-700">Sem affiliate_url</p>
              <p className="text-[11px] text-gray-400 mt-0.5">publicada + affiliate_url IS NULL</p>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className={`font-semibold ${opsStats.sem_cobertura > 0 ? 'text-gray-600' : 'text-emerald-600'}`}>
                {opsStats.sem_cobertura > 0 ? `${opsStats.sem_cobertura} sem affiliate_url configurada` : '✓ Nenhuma sem affiliate_url'}
              </span>
              <span className={`text-[11px] font-medium ${fallbackRows.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                Inativos (busca fallback): {fallbackRows.length > 0 ? `${fallbackRows.length}` : '0 — nenhum'}
              </span>
              <span className={`text-[11px] font-medium ${SEARCH_FALLBACK_UNCOVERED ? 'text-amber-600' : 'text-gray-400'}`}>
                Fallback busca ML para sem-link: <strong>{SEARCH_FALLBACK_UNCOVERED ? 'ON' : 'OFF'}</strong>
                {!SEARCH_FALLBACK_UNCOVERED && ' — cliques vão para source_url ou not-found'}
              </span>
            </div>
          </div>

          {/* Última sync */}
          <div className="px-5 py-4 flex items-start gap-4">
            <div className="shrink-0 w-32">
              <p className="font-semibold text-gray-700">Última atualização de preço</p>
              <p className="text-[11px] text-gray-400 mt-0.5">atualizada manualmente em /admin/precos</p>
            </div>
            <div className="text-gray-600">
              {opsStats.ultima_sync ? (
                <span>
                  {new Date(opsStats.ultima_sync).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' '}BRT
                </span>
              ) : (
                <span className="text-gray-400 italic">Nenhuma sync registrada</span>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ══ SEÇÃO 5 — Mapa de dados ══════════════════════════════════════════ */}
      <section>
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
          Mapa de dados
        </h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 text-xs">

          <div className="px-5 py-4 flex gap-4">
            <span className="shrink-0 w-28 font-semibold text-gray-700 pt-0.5">Sessão</span>
            <div className="flex flex-col gap-1 text-gray-500">
              <p>Identificador de browser (<code className="bg-gray-100 px-1 rounded text-[11px]">session_id</code>). Criado quando o usuário abre o site pela primeira vez — <strong>não depende de iniciar o quiz</strong>. Quem acessa <code>/raquetes/athena</code> diretamente já tem uma sessão.</p>
              <p className="text-[11px] text-gray-400">Tabela: <code>conversations.session_id</code>, <code>link_clicks.session_id</code>, <code>feedback_events.session_id</code></p>
            </div>
          </div>

          <div className="px-5 py-4 flex gap-4">
            <span className="shrink-0 w-28 font-semibold text-gray-700 pt-0.5">Conversa</span>
            <div className="flex flex-col gap-1 text-gray-500">
              <p>Uma chamada de API ao Claude (<code>custo_brl &gt; 0</code>). Uma sessão de quiz pode gerar 1–N conversas conforme o usuário continua interagindo. O contador de <strong>Turnos</strong> no painel = total de linhas com custo &gt; 0 por sessão.</p>
              <p className="text-[11px] text-gray-400">Tabela: <code>conversations</code> · 1 linha por chamada de API. Turnos médios tipicamente entre 1–3 (maioria resolve em 1 chamada).</p>
            </div>
          </div>

          <div className="px-5 py-4 flex gap-4">
            <span className="shrink-0 w-28 font-semibold text-gray-700 pt-0.5">Recomendação</span>
            <div className="flex flex-col gap-1 text-gray-500">
              <p>Quando o modelo retorna raquetes sugeridas (<code>recommended_racket_ids</code> não-vazio). Uma sessão tem <code>had_rec = true</code> se qualquer turno gerou recomendações. A <strong>taxa de recomendação</strong> mede sessões com quiz que chegaram a ter pelo menos 1 recomendação.</p>
              <p className="text-[11px] text-gray-400">Tabela: <code>recommendation_events</code> (1 linha por raquete recomendada)</p>
            </div>
          </div>

          <div className="px-5 py-4 flex gap-4">
            <span className="shrink-0 w-28 font-semibold text-gray-700 pt-0.5">Clique quiz</span>
            <div className="flex flex-col gap-1 text-gray-500">
              <p>Evento registrado pelo <strong>frontend</strong> quando o usuário clica em um botão dentro da interface do quiz. Tipos: <code className="bg-gray-100 px-1 rounded text-[11px]">ver_na_loja</code> (afiliado), <code className="bg-gray-100 px-1 rounded text-[11px]">ver_analise</code> (página da raquete), <code className="bg-gray-100 px-1 rounded text-[11px]">nova_conversa_pos_rec</code>.</p>
              <p className="text-[11px] text-gray-400 mt-1"><strong>ver_analise</strong> mede interesse (navega para página interna). <strong>ver_na_loja</strong> mede intenção de compra (afiliado). Nunca somar os dois como métrica de conversão.</p>
              <p className="text-[11px] text-gray-400">Tabela: <code>feedback_events</code> · usado para calcular funil e % engajou por raquete.</p>
            </div>
          </div>

          <div className="px-5 py-4 flex gap-4">
            <span className="shrink-0 w-28 font-semibold text-gray-700 pt-0.5">Clique link</span>
            <div className="flex flex-col gap-1 text-gray-500">
              <p>Registrado <strong>server-side</strong> ao passar pelo redirect <code>/ir/[slug]</code>. Captura <em>todos</em> os cliques — com ou sem sessão de quiz. Inclui cliques diretos de quem acessa a página da raquete sem ter feito o quiz. Tem <code>tipo</code> (afiliado / busca ML / oficial) e URL de destino.</p>
              <p className="text-[11px] text-gray-400">Tabela: <code>link_clicks</code> · usado no painel <strong>Cliques</strong> e na Seção 1. <strong>Fonte de verdade para métricas de dinheiro.</strong></p>
            </div>
          </div>

          <div className="px-5 py-4 bg-gray-100 rounded-b-xl">
            <p className="font-semibold text-gray-700 mb-1.5">Diferença entre as duas fontes de clique</p>
            <div className="text-gray-500 flex flex-col gap-1">
              <p>Um clique vindo do quiz aparece em <strong>ambas</strong> as tabelas: <code>feedback_events</code> (botão pressionado) + <code>link_clicks</code> (passou pelo redirect). Um clique direto (usuário vai à página da raquete sem quiz) aparece <strong>só em <code>link_clicks</code></strong> — sem <code>session_id</code> na conversa.</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Use <code>link_clicks</code> para contar dinheiro. Use <code>feedback_events</code> para analisar comportamento dentro do quiz.</p>
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}
