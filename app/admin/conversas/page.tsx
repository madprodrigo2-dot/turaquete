import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import AdminPeriodFilter from '../intencoes/AdminPeriodFilter'
import { brtCutoff } from '@/lib/brt'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

type SessionRow = {
  session_id: string
  created_at: string
  starter_usado: string | null
  intencao_detectada: string | null
  primeira_mensagem: string | null
  custo_brl: number
  custo_usd: number
  is_test: boolean
  turn_count: number
  had_rec: boolean
  had_click: boolean
  had_retry: boolean
  ip_hash: string | null
  ip_session_count: number
  utm_source: string | null
  utm_medium: string | null
  referrer: string | null
}

function fmtBrl(v: number) {
  return `R$ ${v.toFixed(4)}`
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export default async function ConversasPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}) {
  const session = await auth()
  if (!session?.user?.email?.endsWith('@gmail.com') &&
      session?.user?.email !== 'madprodrigo@gmail.com') {
    redirect('/admin/login')
  }

  const { days: daysParam = '1', from: fromParam, to: toParam } = await searchParams
  const cookieStore = await cookies()
  const includeTest = cookieStore.get('admin_test_view')?.value === '1'

  let cutoffDate: string
  let daysLabel: string
  if (fromParam) {
    cutoffDate = new Date(fromParam + 'T00:00:00').toISOString()
    daysLabel  = `${fromParam} → ${toParam ?? 'hoje'}`
  } else {
    const daysBack = daysParam === 'all' ? 3650 : Math.max(1, parseInt(daysParam) || 30)
    cutoffDate = brtCutoff(daysBack)
    daysLabel  = daysParam === '1' ? 'hoje' : daysParam === 'all' ? 'todos os tempos' : `últimos ${daysParam} dias`
  }
  const cutoffEnd = toParam ? new Date(toParam + 'T23:59:59').toISOString() : null

  const sb = getAdmin()

  // Latest snapshot per session (most messages = last row per session_id)
  let base = sb
    .from('conversations')
    .select('session_id, created_at, starter_usado, intencao_detectada, primeira_mensagem, custo_brl, custo_usd, is_test, messages, recommended_racket_ids, ip_hash, utm_source, utm_medium, referrer')
    .gte('created_at', cutoffDate)
    .order('created_at', { ascending: false })
    .limit(500)

  if (cutoffEnd) base = base.lte('created_at', cutoffEnd) as typeof base

  const { data: raw } = await (includeTest ? base : base.eq('is_test', false))

  if (!raw) {
    return <p className="text-sm text-gray-500 p-4">Sem dados.</p>
  }

  // Accumulate total cost per session across all rows in the window
  const sessionCostMap = new Map<string, number>()
  const sessionHadRecMap = new Map<string, boolean>()
  const sessionIpMap = new Map<string, string | null>()
  for (const r of raw) {
    sessionCostMap.set(r.session_id, (sessionCostMap.get(r.session_id) ?? 0) + (Number(r.custo_brl) || 0))
    if (Array.isArray(r.recommended_racket_ids) && r.recommended_racket_ids.length > 0) {
      sessionHadRecMap.set(r.session_id, true)
    }
    if (!sessionIpMap.has(r.session_id) && r.ip_hash) {
      sessionIpMap.set(r.session_id, r.ip_hash)
    }
  }
  // Count sessions per ip_hash to detect heavy users
  const ipSessionCount = new Map<string, number>()
  for (const hash of sessionIpMap.values()) {
    if (hash) ipSessionCount.set(hash, (ipSessionCount.get(hash) ?? 0) + 1)
  }

  // Dedupe: keep last (first seen when desc-sorted) per session_id
  const seen = new Set<string>()
  const sessions: SessionRow[] = []
  for (const r of raw) {
    if (seen.has(r.session_id)) continue
    seen.add(r.session_id)
    const msgs: Array<{ role: string }> = Array.isArray(r.messages) ? r.messages : []
    const userTurns = msgs.filter(m => m.role === 'user').length
    const hadRec = sessionHadRecMap.get(r.session_id) ?? false
    sessions.push({
      session_id: r.session_id,
      created_at: r.created_at,
      starter_usado: r.starter_usado,
      intencao_detectada: r.intencao_detectada,
      primeira_mensagem: r.primeira_mensagem,
      custo_brl: sessionCostMap.get(r.session_id) ?? 0,
      custo_usd: Number(r.custo_usd ?? 0),
      is_test: !!r.is_test,
      turn_count: userTurns,
      had_rec: hadRec,
      had_click: false,
      had_retry: false,
      ip_hash: sessionIpMap.get(r.session_id) ?? null,
      ip_session_count: 0,
      utm_source: r.utm_source ?? null,
      utm_medium: r.utm_medium ?? null,
      referrer: r.referrer ?? null,
    })
    if (sessions.length >= 50) break
  }
  for (const s of sessions) {
    if (s.ip_hash) s.ip_session_count = ipSessionCount.get(s.ip_hash) ?? 1
  }

  // Second query: fetch FIRST row per session to get turn-1 metadata
  const sessionIds = sessions.map(s => s.session_id)
  if (sessionIds.length > 0) {
    const [{ data: firstRows }, { data: intencaoRows }] = await Promise.all([
      sb.from('conversations')
        .select('session_id, starter_usado, primeira_mensagem')
        .in('session_id', sessionIds)
        .not('starter_usado', 'is', null)
        .order('created_at', { ascending: true })
        .limit(sessionIds.length),
      sb.from('conversations')
        .select('session_id, intencao_detectada')
        .in('session_id', sessionIds)
        .not('intencao_detectada', 'is', null)
        .order('created_at', { ascending: true })
        .limit(sessionIds.length),
    ])

    if (firstRows) {
      const firstRowMap = new Map<string, { starter_usado: string | null; primeira_mensagem: string | null }>()
      for (const r of firstRows) {
        if (!firstRowMap.has(r.session_id)) firstRowMap.set(r.session_id, r)
      }
      for (const s of sessions) {
        const ft = firstRowMap.get(s.session_id)
        if (ft) {
          s.starter_usado      = ft.starter_usado      ?? s.starter_usado
          s.primeira_mensagem  = ft.primeira_mensagem  ?? s.primeira_mensagem
        }
      }
    }

    if (intencaoRows) {
      const intencaoMap = new Map<string, string>()
      for (const r of intencaoRows) {
        if (!intencaoMap.has(r.session_id) && r.intencao_detectada) {
          intencaoMap.set(r.session_id, r.intencao_detectada)
        }
      }
      for (const s of sessions) {
        const intencao = intencaoMap.get(s.session_id)
        if (intencao) s.intencao_detectada = intencao
      }
    }
  }

  // Query: fetch ver_na_loja clicks and timeout_retry events per session
  if (sessionIds.length > 0) {
    const [{ data: clickRows }, { data: retryRows }] = await Promise.all([
      sb.from('feedback_events').select('session_id').in('session_id', sessionIds).eq('event_type', 'ver_na_loja'),
      sb.from('feedback_events').select('session_id').in('session_id', sessionIds).eq('event_type', 'timeout_retry'),
    ])
    if (clickRows) {
      const clickSet = new Set(clickRows.map(r => r.session_id))
      for (const s of sessions) {
        if (clickSet.has(s.session_id)) s.had_click = true
      }
    }
    if (retryRows) {
      const retrySet = new Set(retryRows.map(r => r.session_id))
      for (const s of sessions) {
        if (retrySet.has(s.session_id)) s.had_retry = true
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Conversas</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">{sessions.length} sessões · {daysLabel}</p>
        </div>
        <Suspense fallback={null}>
          <AdminPeriodFilter current={fromParam ? '' : daysParam} currentFrom={fromParam} currentTo={toParam} />
        </Suspense>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-400">
              <th className="text-left px-3 py-2">Data (BRT)</th>
              <th className="text-left px-3 py-2">Starter / Primeira msg</th>
              <th className="text-left px-3 py-2">Intenção</th>
              <th className="text-center px-3 py-2">Turnos</th>
              <th className="text-right px-3 py-2">Custo</th>
              <th className="text-center px-3 py-2">Rec?</th>
              <th className="text-center px-3 py-2">Loja?</th>
              <th className="text-center px-3 py-2" title="Usuário clicou em 'Tentar de novo' após timeout">↻?</th>
              <th className="text-center px-3 py-2">IP</th>
              <th className="text-left px-3 py-2">Origem</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sessions.map(s => (
              <tr key={s.session_id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-3 py-2 whitespace-nowrap text-gray-500 font-mono">
                  {fmtDate(s.created_at)}
                  {s.is_test && (
                    <span className="ml-1 bg-amber-50 text-amber-600 text-[9px] px-1 rounded">teste</span>
                  )}
                </td>
                <td className="px-3 py-2 max-w-[220px]">
                  {s.starter_usado ? (
                    <span className="bg-teal-50 text-teal-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
                      {s.starter_usado}
                    </span>
                  ) : (
                    <span className="text-gray-600 truncate block">
                      {s.primeira_mensagem ?? <span className="text-gray-300 italic">—</span>}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {s.intencao_detectada ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 text-center text-gray-600">{s.turn_count}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-600">
                  {s.custo_brl > 0 ? fmtBrl(s.custo_brl) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {s.had_rec
                    ? <span className="text-teal-600 font-bold">✓</span>
                    : <span className="text-gray-200">—</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {s.had_click
                    ? <span className="text-orange-500 font-bold">✓</span>
                    : <span className="text-gray-200">—</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {s.had_retry
                    ? <span className="text-amber-500 font-bold" title="Clicou em Tentar de novo">↻</span>
                    : <span className="text-gray-200">—</span>}
                </td>
                <td className="px-3 py-2 text-center font-mono">
                  {s.ip_hash ? (
                    <span
                      title={`hash: ${s.ip_hash}`}
                      className={s.ip_session_count >= 3 ? 'text-red-500 font-bold' : 'text-gray-300'}
                    >
                      {s.ip_session_count >= 3 ? `×${s.ip_session_count}` : '·'}
                    </span>
                  ) : <span className="text-gray-200">—</span>}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 max-w-[120px]">
                  {s.utm_source ? (
                    <span className="font-medium text-teal-700">{s.utm_source}{s.utm_medium ? `/${s.utm_medium}` : ''}</span>
                  ) : s.referrer ? (
                    <span className="text-gray-400 truncate block">{s.referrer}</span>
                  ) : (
                    <span className="text-gray-200">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/conversas/${s.session_id}`}
                    className="text-teal-600 hover:text-teal-800 hover:underline whitespace-nowrap"
                  >
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
