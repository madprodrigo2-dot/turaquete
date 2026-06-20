import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import AdminPeriodFilter from './AdminPeriodFilter'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

interface SessionCostRow {
  session_id: string
  total_brl:  number
  total_usd:  number
  turns:      number
  had_rec:    boolean
  first_turn_at: string
}
interface ClickRow    { session_id: string; event_type: string }
interface IntencaoRow { intencao_detectada: string | null; total: number }
interface RacketRow   { id: number; name: string }

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
function fmtBrl(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
}
function avg(arr: number[]): number | null {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
}

export default async function GeralAdmin({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const { days: daysParam = '30' } = await searchParams
  const cookieStore = await cookies()
  const includeTest = cookieStore.get('admin_test_view')?.value === '1'
  const daysBack   = daysParam === 'all' ? 3650 : Math.max(1, parseInt(daysParam) || 30)
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  const daysLabel  = daysParam === '1' ? 'hoje' : daysParam === 'all' ? 'todos os tempos' : `últimos ${daysParam} dias`

  const sb = getAdmin()

  const supabaseUrl    = process.env.SUPABASE_URL ?? ''
  const supabaseDomain = supabaseUrl.replace('https://', '').replace(/\/$/, '')

  const [sessionCostRows, clickRows, intentRows, semAfiliadoRows, columnCheck] = await Promise.all([
    sb.rpc('admin_cost_by_session', { days_back: daysBack, p_include_test: includeTest }).then(r => (r.data ?? []) as SessionCostRow[]),
    (() => {
      const q = sb.from('feedback_events')
        .select('session_id, event_type')
        .in('event_type', ['ver_na_loja', 'ver_analise'])
        .gte('created_at', cutoffDate)
      return (includeTest ? q : q.eq('is_test', false)).then(r => (r.data ?? []) as ClickRow[])
    })(),
    sb.rpc('admin_intencao_counts', { p_include_test: includeTest }).then(r => (r.data ?? []) as IntencaoRow[]),
    sb.from('rackets').select('id, name').eq('publicada', true).is('affiliate_url', null).order('name')
      .then(r => (r.data ?? []) as RacketRow[]),
    sb.from('conversations').select('primeira_mensagem').limit(1)
      .then(r => ({ ok: !r.error, errorMsg: r.error?.message ?? null })),
  ])

  const sessions          = sessionCostRows.filter(r => r.total_brl > 0)
  const sessionsWithRec   = sessions.filter(r => r.had_rec)
  const clickSessionIds   = new Set(clickRows.map(r => r.session_id))
  const sessionsWithClick = sessions.filter(r => clickSessionIds.has(r.session_id))
  const avgBrl            = avg(sessions.map(r => r.total_brl))
  const primeiraMsgColumnMissing = !columnCheck.ok

  // Top intenção (all-time from RPC)
  const totalInt = intentRows.reduce((a, r) => a + r.total, 0)
  const topIntent = intentRows[0] ?? null

  const analiseHref = `/admin/analise?days=${daysParam}`

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-800">Geral</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">{daysLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <AdminPeriodFilter current={daysParam} />
          </Suspense>
        </div>
      </div>

      {/* Migration notice */}
      {primeiraMsgColumnMissing && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-800 flex flex-col gap-2">
          <p className="font-semibold">
            ⚠️ Coluna <code className="font-mono bg-amber-100 px-1 rounded">primeira_mensagem</code> ausente
            {supabaseDomain && <span className="font-normal text-amber-600 ml-2">— {supabaseDomain}</span>}
          </p>
          <pre className="bg-amber-100 rounded px-3 py-2 font-mono text-amber-900 text-[11px] overflow-x-auto whitespace-pre-wrap">{`ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS primeira_mensagem TEXT,
  ADD COLUMN IF NOT EXISTS starter_usado TEXT,
  ADD COLUMN IF NOT EXISTS intencao_detectada TEXT;`}</pre>
        </div>
      )}

      {/* Sem afiliado warning */}
      {semAfiliadoRows.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-xs text-amber-800 flex flex-col gap-1.5">
          <p className="font-semibold">
            ⚠️ {semAfiliadoRows.length} raquete{semAfiliadoRows.length !== 1 ? 's' : ''} publicada{semAfiliadoRows.length !== 1 ? 's' : ''} sem link afiliado
          </p>
          <div className="flex flex-wrap gap-1.5">
            {semAfiliadoRows.map(r => (
              <span key={r.id} className="font-mono bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{r.name}</span>
            ))}
          </div>
          <Link href="/admin/afiliados" className="text-amber-700 underline w-fit">Gerenciar afiliados →</Link>
        </div>
      )}

      {/* Hero card — taxa de clique (métrica crítica) */}
      <Link
        href={analiseHref}
        className="group block rounded-2xl border-2 border-teal-200 bg-teal-50 hover:bg-teal-100/60 hover:border-teal-300 transition-all px-8 py-7"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-500 mb-1">
          Taxa de clique em loja
        </p>
        <p className="text-6xl font-bold text-teal-700 leading-none">
          {pct(sessionsWithClick.length, sessions.length)}
        </p>
        <p className="text-sm text-teal-500 mt-2">
          {sessionsWithClick.length} de {sessions.length} conversas · {daysLabel}
        </p>
        <p className="text-xs text-teal-400 mt-3 group-hover:text-teal-600 transition-colors">
          Ver detalhes em Análise →
        </p>
      </Link>

      {/* Grid 2×2 — outros titulares */}
      <div className="grid grid-cols-2 gap-3">

        <Link
          href={analiseHref}
          className="group rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all px-5 py-5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Taxa de recomendação</p>
          <p className="text-4xl font-bold text-gray-900 leading-none">{pct(sessionsWithRec.length, sessions.length)}</p>
          <p className="text-xs text-gray-400 mt-1.5">{sessionsWithRec.length} de {sessions.length} conv.</p>
          <p className="text-[10px] text-gray-300 mt-3 group-hover:text-teal-500 transition-colors">→ Análise</p>
        </Link>

        <div className="rounded-xl border border-gray-100 bg-white px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Conversas</p>
          <p className="text-4xl font-bold text-gray-900 leading-none">{sessions.length}</p>
          <p className="text-xs text-gray-400 mt-1.5">{daysLabel}</p>
        </div>

        <Link
          href={analiseHref}
          className="group rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all px-5 py-5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Custo médio / conversa</p>
          <p className="text-4xl font-bold text-gray-900 leading-none">{avgBrl != null ? fmtBrl(avgBrl) : '—'}</p>
          <p className="text-xs text-gray-400 mt-1.5">{sessions.length} sessões com custo</p>
          <p className="text-[10px] text-gray-300 mt-3 group-hover:text-teal-500 transition-colors">→ Detalhes em Análise</p>
        </Link>

        {topIntent ? (
          <Link
            href={analiseHref}
            className="group rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all px-5 py-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Intenção #1{' '}
              <span className="font-normal normal-case tracking-normal text-gray-300">(todos os tempos)</span>
            </p>
            <p className="text-2xl font-bold text-gray-900 leading-tight break-words">{topIntent.intencao_detectada}</p>
            <p className="text-xs text-gray-400 mt-1.5">{pct(topIntent.total, totalInt)} das conv. · {topIntent.total} total</p>
            <p className="text-[10px] text-gray-300 mt-3 group-hover:text-teal-500 transition-colors">→ Ver distribuição em Análise</p>
          </Link>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Intenção #1</p>
            <p className="text-sm text-gray-300 italic">sem dados ainda</p>
          </div>
        )}
      </div>

    </div>
  )
}
