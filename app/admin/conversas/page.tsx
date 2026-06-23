import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'

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

export default async function ConversasPage() {
  const session = await auth()
  if (!session?.user?.email?.endsWith('@gmail.com') &&
      session?.user?.email !== 'madprodrigo@gmail.com') {
    redirect('/admin/login')
  }

  const sb = getAdmin()

  // Latest snapshot per session (most messages = last row per session_id)
  const { data: raw } = await sb
    .from('conversations')
    .select('session_id, created_at, starter_usado, intencao_detectada, primeira_mensagem, custo_brl, custo_usd, is_test, messages')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!raw) {
    return <p className="text-sm text-gray-500 p-4">Sem dados.</p>
  }

  // Dedupe: keep last (first seen when desc-sorted) per session_id
  const seen = new Set<string>()
  const sessions: SessionRow[] = []
  for (const r of raw) {
    if (seen.has(r.session_id)) continue
    seen.add(r.session_id)
    const msgs: Array<{ role: string }> = Array.isArray(r.messages) ? r.messages : []
    const userTurns = msgs.filter(m => m.role === 'user').length
    const assistantMsgs = msgs.filter(m => m.role === 'assistant')
    const lastAssistant = assistantMsgs[assistantMsgs.length - 1] as { role: string; content?: string } | undefined
    const hadRec = typeof lastAssistant?.content === 'string'
      ? lastAssistant.content.includes('essas são as que eu escolheria') ||
        lastAssistant.content.includes('escolheria pra você') ||
        lastAssistant.content.includes('recomendo')
      : false
    sessions.push({
      session_id: r.session_id,
      created_at: r.created_at,
      starter_usado: r.starter_usado,
      intencao_detectada: r.intencao_detectada,
      primeira_mensagem: r.primeira_mensagem,
      custo_brl: Number(r.custo_brl ?? 0),
      custo_usd: Number(r.custo_usd ?? 0),
      is_test: !!r.is_test,
      turn_count: userTurns,
      had_rec: hadRec,
    })
    if (sessions.length >= 50) break
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-semibold text-gray-900">Conversas recentes</h1>
        <span className="text-xs text-gray-400">{sessions.length} sessões</span>
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
