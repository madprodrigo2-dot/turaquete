import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { auth, signOut } from '@/auth'
import { USD_TO_BRL } from '@/lib/agent/pricing'
import AdminPeriodFilter from './AdminPeriodFilter'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

// ── Types ──────────────────────────────────────────────────────────────────────
interface IntencaoRow   { intencao_detectada: string | null; total: number }
interface StarterRow    { starter: string | null; total: number }
interface MensagemRow   {
  created_at:         string
  starter_usado:      string | null
  intencao_detectada: string | null
  primeira_mensagem:  string | null
}
interface SessionCostRow {
  session_id:    string
  total_brl:     number
  total_usd:     number
  turns:         number
  had_rec:       boolean
  first_turn_at: string
}
interface ClickRow    { session_id: string; event_type: string; created_at: string }
interface RecEventRow { racket_id: number }
interface RacketRow   { id: number; name: string }

// ── Rentabilidade — ajustar quando tiver dados reais ───────────────────────────
const COMISSAO_ESTIMADA_BRL: number | null = null
const TAXA_CLIQUE_TO_VENDA:  number | null = null

// ── Helpers ────────────────────────────────────────────────────────────────────
function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function fmtBrl(v: number, decimals = 4) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}
function fmtUsd(v: number) { return `US$ ${v.toFixed(4)}` }
function avg(arr: number[]): number | null {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
}
function pct(num: number, den: number): string {
  return den === 0 ? '—' : `${Math.round((num / den) * 100)}%`
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function IntencoesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; starter?: string }>
}) {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login')
  }

  const { days: daysParam = '30', starter: starterParam } = await searchParams
  const daysBack    = daysParam === 'all' ? 3650 : Math.max(1, parseInt(daysParam) || 30)
  const cutoffDate  = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  const filterStarter = starterParam !== undefined ? decodeURIComponent(starterParam) : null
  const daysLabel   = daysParam === '1' ? 'hoje' : daysParam === 'all' ? 'todos os tempos' : `últimos ${daysParam} dias`

  const sb  = getAdmin()
  const now = Date.now()
  const ago7  = new Date(now -  7 * 24 * 60 * 60 * 1000).toISOString()
  const ago1  = new Date(now -  1 * 24 * 60 * 60 * 1000).toISOString()

  // ── Verificar se coluna primeira_mensagem existe ────────────────────────────
  const columnCheck = await sb
    .from('conversations')
    .select('primeira_mensagem')
    .limit(1)
    .then(r => ({ ok: !r.error, errorMsg: r.error?.message ?? null }))

  const primeiraMsgColumnMissing = !columnCheck.ok

  // ── Queries em paralelo ─────────────────────────────────────────────────────
  const [
    intentRows,
    starterRows,
    msgRows,
    sessionCostRows,
    clickRows,
    recEventRows,
    starterDetailRows,
  ] = await Promise.all([
    sb.rpc('admin_intencao_counts').then(r => (r.data ?? []) as IntencaoRow[]),
    sb.rpc('admin_starter_counts').then(r => (r.data ?? []) as StarterRow[]),

    primeiraMsgColumnMissing
      ? Promise.resolve([] as MensagemRow[])
      : sb
          .from('conversations')
          .select('created_at, starter_usado, intencao_detectada, primeira_mensagem')
          .not('primeira_mensagem', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50)
          .then(r => (r.data ?? []) as MensagemRow[]),

    sb.rpc('admin_cost_by_session', { days_back: daysBack })
      .then(r => (r.data ?? []) as SessionCostRow[]),

    sb.from('feedback_events')
      .select('session_id, event_type, created_at')
      .in('event_type', ['ver_na_loja', 'ver_analise'])
      .gte('created_at', cutoffDate)
      .then(r => (r.data ?? []) as ClickRow[]),

    sb.from('recommendation_events')
      .select('racket_id')
      .gte('created_at', cutoffDate)
      .then(r => (r.data ?? []) as RecEventRow[]),

    // Detalhe de um starter específico
    filterStarter === null || primeiraMsgColumnMissing
      ? Promise.resolve([] as MensagemRow[])
      : filterStarter === 'livre'
        ? sb.from('conversations')
            .select('created_at, primeira_mensagem, intencao_detectada')
            .is('starter_usado', null)
            .not('primeira_mensagem', 'is', null)
            .order('created_at', { ascending: false })
            .limit(100)
            .then(r => (r.data ?? []) as MensagemRow[])
        : sb.from('conversations')
            .select('created_at, primeira_mensagem, intencao_detectada')
            .eq('starter_usado', filterStarter)
            .not('primeira_mensagem', 'is', null)
            .order('created_at', { ascending: false })
            .limit(100)
            .then(r => (r.data ?? []) as MensagemRow[]),
  ])

  // ── Fallback RPCs ───────────────────────────────────────────────────────────
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

  // ── Top raquetes recomendadas ───────────────────────────────────────────────
  const racketCounts: Record<number, number> = {}
  for (const e of recEventRows) {
    racketCounts[e.racket_id] = (racketCounts[e.racket_id] ?? 0) + 1
  }
  const topRacketIds = Object.entries(racketCounts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 10)
    .map(([id]) => Number(id))

  const racketNames: RacketRow[] = topRacketIds.length
    ? await sb.from('rackets').select('id, name').in('id', topRacketIds)
        .then(r => (r.data ?? []) as RacketRow[])
    : []

  const topRaquetes = topRacketIds.map(id => ({
    id,
    name: racketNames.find(r => r.id === id)?.name ?? `ID ${id}`,
    count: racketCounts[id] ?? 0,
  }))

  // ── Cost stats ──────────────────────────────────────────────────────────────
  const sessions    = sessionCostRows.filter(r => r.total_brl > 0)
  const sessions7   = sessions.filter(r => r.first_turn_at >= ago7)
  const sessions1   = sessions.filter(r => r.first_turn_at >= ago1)

  // Para as 3 janelas temporais, usamos sempre os dados do período selecionado
  // mas também mostramos comparativos 7d/1d quando daysBack >= 7
  const avgBrl  = avg(sessions.map(r => r.total_brl))
  const avg7Brl = avg(sessions7.map(r => r.total_brl))
  const avg1Brl = avg(sessions1.map(r => r.total_brl))
  const avgUsd  = avg(sessions.map(r => r.total_usd))
  const avg7Usd = avg(sessions7.map(r => r.total_usd))
  const avg1Usd = avg(sessions1.map(r => r.total_usd))

  const totalBrl = sessions.reduce((a, r) => a + r.total_brl, 0)
  const total7Brl = sessions7.reduce((a, r) => a + r.total_brl, 0)
  const totalUsd = sessions.reduce((a, r) => a + r.total_usd, 0)
  const total7Usd = sessions7.reduce((a, r) => a + r.total_usd, 0)

  const maxCost     = sessions.length > 0 ? Math.max(...sessions.map(r => r.total_brl)) : null
  const avgTurns    = avg(sessions.map(r => r.turns))
  const avgCostTurn = avgBrl != null && avgTurns != null && avgTurns > 0 ? avgBrl / avgTurns : null
  const hasCostData = sessions.length > 0

  // ── Cliques ─────────────────────────────────────────────────────────────────
  const clickSessionIds       = new Set(clickRows.map(r => r.session_id))
  const affiliateClicks       = clickRows.filter(r => r.event_type === 'ver_na_loja')
  const sessionsWithClick     = sessions.filter(r => clickSessionIds.has(r.session_id))
  const taxaConversao         = sessions.length > 0 ? sessionsWithClick.length / sessions.length : 0
  const custoPorClique        = affiliateClicks.length > 0 ? totalBrl / affiliateClicks.length : null

  // ── Rentabilidade ───────────────────────────────────────────────────────────
  const pontoEquilibrio        = COMISSAO_ESTIMADA_BRL != null && avgBrl != null && avgBrl > 0
    ? Math.round(COMISSAO_ESTIMADA_BRL / avgBrl) : null
  const receitaEstimadaConv   = COMISSAO_ESTIMADA_BRL != null && TAXA_CLIQUE_TO_VENDA != null && sessions.length > 0
    ? COMISSAO_ESTIMADA_BRL * taxaConversao * TAXA_CLIQUE_TO_VENDA : null
  const isAboveEquilibrio     = receitaEstimadaConv != null && avgBrl != null
    ? receitaEstimadaConv >= avgBrl : null

  // ── Taxa de recomendação ────────────────────────────────────────────────────
  const sessionsWithRec = sessions.filter(r => r.had_rec)
  const taxaRec         = sessions.length > 0 ? sessionsWithRec.length / sessions.length : null

  // ── Análise Inteligente ─────────────────────────────────────────────────────
  type Insight = { level: 'ok' | 'warn' | 'info' | 'neutral'; text: string }
  const insights: Insight[] = []
  const MIN_DATA = 5
  const totalConv = sessions.length

  if (totalConv < MIN_DATA) {
    insights.push({ level: 'neutral', text: `Apenas ${totalConv} conversa${totalConv !== 1 ? 's' : ''} no período — ainda poucos dados para tendências confiáveis.` })
  } else {
    // Intenção dominante
    const totalIntencoes = intencoes.reduce((a, r) => a + r.total, 0)
    const topIntent = intencoes[0] ?? null
    if (topIntent && totalIntencoes > 0) {
      insights.push({
        level: 'info',
        text: `"${topIntent.intencao_detectada}" é a intenção #1 (${pct(topIntent.total, totalIntencoes)} das conversas com intenção detectada). Vale priorizar esse fluxo no copy e nos starters.`,
      })
    }

    // Starters vs livre
    const totalMsg   = starters.reduce((a, r) => a + r.total, 0)
    const livreCount = starters.find(r => r.starter === null)?.total ?? 0
    if (totalMsg >= MIN_DATA) {
      if (livreCount / totalMsg > 0.4) {
        insights.push({ level: 'info', text: `${pct(livreCount, totalMsg)} escrevem livremente (sem starter) — chegam com casos específicos em mente. Analise as mensagens livres para descobrir padrões.` })
      } else {
        insights.push({ level: 'ok', text: `${pct(livreCount, totalMsg)} digitam livremente; maioria usa starters. Starters estão guiando bem a conversa.` })
      }
    }

    // Taxa de recomendação
    if (taxaRec !== null) {
      insights.push({
        level: taxaRec >= 0.5 ? 'ok' : 'warn',
        text: `${pct(sessionsWithRec.length, totalConv)} das conversas chegaram a uma recomendação (${daysLabel}).${taxaRec < 0.5 ? ' Abaixo de 50% — pode indicar abandono precoce ou dificuldade de qualificação.' : ''}`,
      })
    }

    // Taxa de clique
    if (sessions.length >= MIN_DATA) {
      const msg = taxaConversao < 0.08
        ? `${pct(sessionsWithClick.length, totalConv)} clicaram em loja ou análise (${daysLabel}). Abaixo de 8% — verificar se os links de afiliado estão visíveis e ativos.`
        : `${pct(sessionsWithClick.length, totalConv)} clicaram em loja ou análise (${daysLabel}).`
      insights.push({ level: taxaConversao >= 0.08 ? 'ok' : 'warn', text: msg })
    }

    // Custo e turnos
    if (avgBrl != null && avgTurns != null) {
      insights.push({
        level: 'neutral',
        text: `Custo médio ${fmtBrl(avgBrl, 4)}/conversa · ${avgTurns.toFixed(1)} turnos/sessão em média (${daysLabel}).${avgTurns > 6 ? ' Muitos turnos — agente pode estar demorando para qualificar.' : ''}`,
      })
    }

    // Alerta sem dados de primeira mensagem
    if (primeiraMsgColumnMissing) {
      insights.push({ level: 'warn', text: 'Coluna primeira_mensagem não encontrada na tabela conversations. Execute a migration abaixo para habilitar o detalhe de conversas.' })
    }
  }

  // ── Link para detalhe de starter ───────────────────────────────────────────
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

  // ── Icon helpers ────────────────────────────────────────────────────────────
  const insightIcon: Record<Insight['level'], string> = {
    ok:      '✅',
    warn:    '⚠️',
    info:    '💡',
    neutral: '📊',
  }
  const insightBg: Record<Insight['level'], string> = {
    ok:      'bg-emerald-50 border-emerald-200 text-emerald-800',
    warn:    'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    neutral: 'bg-gray-50 border-gray-200 text-gray-700',
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-sm text-gray-800">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Painel de Intenções</h1>
              <div className="flex gap-2">
                <Link href="/admin/intencoes" className={`text-xs px-2.5 py-1 rounded-full font-medium ${!filterStarter ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Geral</Link>
                <Link href="/admin/qualidade" className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-200 text-gray-600 hover:bg-gray-300">Qualidade</Link>
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">Turaquete Admin · {session.user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <AdminPeriodFilter current={daysParam} />
            </Suspense>
            <form action={async () => { 'use server'; await signOut({ redirectTo: '/admin/login' }) }}>
              <button type="submit" className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
                Sair
              </button>
            </form>
          </div>
        </div>

        {/* ── Migration notice ── */}
        {primeiraMsgColumnMissing && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col gap-2">
            <p className="font-semibold text-amber-800 text-sm">⚠️ Coluna <code className="font-mono bg-amber-100 px-1 rounded">primeira_mensagem</code> ausente na tabela <code className="font-mono bg-amber-100 px-1 rounded">conversations</code></p>
            <p className="text-amber-700 text-xs">O código já grava essa coluna, mas ela precisa existir no banco. Execute no Supabase SQL Editor:</p>
            <pre className="bg-amber-100 rounded-lg px-4 py-3 text-xs font-mono text-amber-900 overflow-x-auto whitespace-pre-wrap">
              {`ALTER TABLE public.conversations\n  ADD COLUMN IF NOT EXISTS primeira_mensagem TEXT;\n\n-- Opcional: também garantir as outras colunas\nALTER TABLE public.conversations\n  ADD COLUMN IF NOT EXISTS starter_usado TEXT,\n  ADD COLUMN IF NOT EXISTS intencao_detectada TEXT;`}
            </pre>
          </div>
        )}

        {/* ── Análise Inteligente ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Análise Inteligente <span className="text-gray-400 font-normal text-xs">— {daysLabel}</span></h2>
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

        {/* ── Custos ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Custos (API Anthropic) <span className="text-gray-400 font-normal text-xs">— {daysLabel}</span></h2>
          {!hasCostData ? (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm px-4 py-3 text-gray-400 italic text-xs">
              Sem dados de custo para o período selecionado.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {([
                  { label: 'Custo médio — hoje',     brl: avg1Brl, usd: avg1Usd, n: sessions1.length  },
                  { label: 'Custo médio — 7 dias',   brl: avg7Brl, usd: avg7Usd, n: sessions7.length  },
                  { label: `Custo médio — ${daysLabel}`, brl: avgBrl,  usd: avgUsd,  n: sessions.length, star: true },
                ] as { label: string; brl: number | null; usd: number | null; n: number; star?: boolean }[]).map(({ label, brl, usd, n, star }) => (
                  <div key={label} className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1 ${star ? 'border-teal-300' : 'border-gray-100'}`}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
                    <p className={`font-bold text-gray-900 ${star ? 'text-2xl' : 'text-lg'}`}>{brl != null ? fmtBrl(brl) : '—'}</p>
                    {usd != null && <p className="text-[11px] text-gray-400">{fmtUsd(usd)}</p>}
                    <p className="text-[10px] text-gray-300">{n} conv.</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total — 7 dias',          value: fmtBrl(total7Brl, 2),  sub: fmtUsd(total7Usd)   },
                  { label: `Total — ${daysLabel}`,     value: fmtBrl(totalBrl, 2),   sub: fmtUsd(totalUsd)    },
                  { label: 'Conversa mais cara',       value: maxCost != null ? fmtBrl(maxCost) : '—', sub: 'detectar anomalias' },
                  { label: 'Custo médio / turno',      value: avgCostTurn != null ? fmtBrl(avgCostTurn) : '—', sub: avgTurns != null ? `≈ ${avgTurns.toFixed(1)} turnos/conv` : '' },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
                    <p className="text-base font-bold text-gray-800">{value}</p>
                    <p className="text-[10px] text-gray-300">{sub}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── Rentabilidade ── */}
        {hasCostData && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Rentabilidade</h2>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">Taxa recomendação</p>
                  <p className="text-base font-bold text-gray-800">{taxaRec !== null ? pct(sessionsWithRec.length, sessions.length) : '—'}</p>
                  <p className="text-[10px] text-gray-300">{sessionsWithRec.length} de {sessions.length} conv. receberam raquete</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">Taxa clique em loja</p>
                  <p className="text-base font-bold text-gray-800">{pct(sessionsWithClick.length, sessions.length)}</p>
                  <p className="text-[10px] text-gray-300">{sessionsWithClick.length} de {sessions.length} conv.</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">Custo / clique afiliado</p>
                  <p className="text-base font-bold text-gray-800">{custoPorClique != null ? fmtBrl(custoPorClique) : '—'}</p>
                  <p className="text-[10px] text-gray-300">{affiliateClicks.length} cliques &ldquo;Ver na loja&rdquo;</p>
                </div>
              </div>
              <div className={`rounded-xl border px-5 py-4 ${
                isAboveEquilibrio === true ? 'bg-emerald-50 border-emerald-200' :
                isAboveEquilibrio === false ? 'bg-amber-50 border-amber-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Ponto de equilíbrio</p>
                {COMISSAO_ESTIMADA_BRL == null ? (
                  <p className="text-xs text-gray-400 italic">
                    Defina <code className="font-mono bg-gray-100 px-1 rounded">COMISSAO_ESTIMADA_BRL</code> em{' '}
                    <code className="font-mono bg-gray-100 px-1 rounded">app/admin/intencoes/page.tsx</code>{' '}
                    para calcular o ponto de equilíbrio.
                    <br /><span className="text-gray-300">Referência: ticket médio ~R$2.000–2.400 · comissão ML ~5–8% → R$100–192/venda.</span>
                  </p>
                ) : (
                  <div className="flex items-start gap-6 flex-wrap">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">1 comissão cobre</p>
                      <p className="text-2xl font-bold text-gray-900">{pontoEquilibrio != null ? `${pontoEquilibrio.toLocaleString('pt-BR')} conv.` : '—'}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">comissão est.: {fmtBrl(COMISSAO_ESTIMADA_BRL, 2)} · custo médio: {avgBrl != null ? fmtBrl(avgBrl) : '—'}/conv</p>
                    </div>
                    {receitaEstimadaConv != null && avgBrl != null && (
                      <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${isAboveEquilibrio ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isAboveEquilibrio ? 'Acima do ponto ✓' : 'Abaixo do ponto'}
                        <p className="text-[11px] font-normal mt-0.5">receita est. {fmtBrl(receitaEstimadaConv)} vs custo {fmtBrl(avgBrl)}/conv</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Top raquetes recomendadas ── */}
        {topRaquetes.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Top raquetes recomendadas <span className="text-gray-400 font-normal text-xs">— {daysLabel}</span></h2>
            <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left px-4 py-2">Raquete</th>
                    <th className="text-right px-4 py-2">Recomendações</th>
                    <th className="text-right px-4 py-2">% do total</th>
                  </tr>
                </thead>
                <tbody>
                  {topRaquetes.map((r, i) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">{r.name}</td>
                      <td className="px-4 py-2 text-right font-semibold">{r.count}</td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        {pct(r.count, recEventRows.length)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-gray-300 px-4 py-2">{recEventRows.length} recomendações totais no período</p>
            </div>
          </section>
        )}

        {/* ── Intenções ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-1">Por intenção</h2>
          <p className="text-[11px] text-gray-400 mb-3">Todos os tempos (filtro de período não afeta esta tabela)</p>
          <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Intenção</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-right px-4 py-2">%</th>
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
                  </tr>
                )
              })}
              {intencoes.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-3 text-gray-400 italic">Sem dados ainda.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* ── Starters ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-1">Starters usados</h2>
          <p className="text-[11px] text-gray-400 mb-3">Todos os tempos · clique num starter para ver as primeiras mensagens</p>
          <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Starter</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-right px-4 py-2">%</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {starters.map(r => {
                const total   = starters.reduce((a, x) => a + x.total, 0)
                const isActive = filterStarter !== null && (filterStarter === (r.starter ?? 'livre'))
                return (
                  <tr key={r.starter ?? 'livre'} className={`border-t border-gray-100 ${isActive ? 'bg-teal-50' : ''}`}>
                    <td className="px-4 py-2">
                      {r.starter ?? <span className="italic text-gray-500">livre (digitou)</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">{r.total}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{pct(r.total, total)}</td>
                    <td className="px-4 py-2 text-right">
                      {primeiraMsgColumnMissing ? (
                        <span className="text-gray-300 text-[10px]">migration pendente</span>
                      ) : (
                        <Link
                          href={starterDetailHref(r.starter)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                            isActive
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-teal-100 hover:text-teal-700'
                          }`}
                        >
                          {isActive ? 'Aberto ↓' : 'Ver mensagens'}
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
              {starters.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-3 text-gray-400 italic">Sem dados ainda.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* ── Detalhe de starter ── */}
        {filterStarter !== null && !primeiraMsgColumnMissing && (
          <section className="border-2 border-teal-200 rounded-2xl p-5 bg-teal-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-teal-900">
                  Mensagens: <span className="font-normal italic">&ldquo;{filterStarter === 'livre' ? 'livre (digitou)' : filterStarter}&rdquo;</span>
                </h2>
                <p className="text-teal-600 text-xs mt-0.5">
                  {starterDetailRows.length} mensagem{starterDetailRows.length !== 1 ? 's' : ''} encontrada{starterDetailRows.length !== 1 ? 's' : ''}
                  {filterStarter === 'livre' && ' — texto original do usuário, sem edição'}
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
                    <span>{new Date(r.created_at).toLocaleString('pt-BR')}</span>
                    {r.intencao_detectada && (
                      <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">{r.intencao_detectada}</span>
                    )}
                  </div>
                  <p className="text-gray-800 leading-snug text-sm">{r.primeira_mensagem}</p>
                </div>
              ))}
              {starterDetailRows.length === 0 && (
                <p className="text-teal-600 italic text-sm">Nenhuma mensagem encontrada para este starter.</p>
              )}
            </div>
          </section>
        )}

        {/* ── Últimas 50 primeiras mensagens ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Últimas 50 primeiras mensagens</h2>
          {primeiraMsgColumnMissing ? (
            <p className="text-amber-600 italic text-xs bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              Execute a migration SQL acima para habilitar esta seção.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {msgRows.map((r, i) => (
                <div key={i} className="bg-white rounded-lg px-4 py-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-1 flex-wrap">
                    <span>{new Date(r.created_at).toLocaleString('pt-BR')}</span>
                    {r.starter_usado && (
                      <Link href={starterDetailHref(r.starter_usado)} className="bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium hover:bg-emerald-200 transition-colors">
                        {r.starter_usado}
                      </Link>
                    )}
                    {!r.starter_usado && (
                      <Link href={starterDetailHref(null)} className="bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium italic hover:bg-gray-200 transition-colors">
                        livre
                      </Link>
                    )}
                    {r.intencao_detectada && (
                      <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">{r.intencao_detectada}</span>
                    )}
                  </div>
                  <p className="text-gray-800 leading-snug">{r.primeira_mensagem}</p>
                </div>
              ))}
              {msgRows.length === 0 && (
                <p className="text-gray-400 italic">Sem primeiras mensagens registradas ainda.</p>
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
