import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

interface IntencaoRow { intencao_detectada: string | null; total: number }
interface StarterRow  { starter: string | null; total: number }
interface MensagemRow {
  created_at: string
  starter_usado: string | null
  intencao_detectada: string | null
  primeira_mensagem: string | null
}

function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export default async function IntencoesAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  // Simple token gate — keep ADMIN_TOKEN in env vars, never commit
  const params = await searchParams
  const token = params.token ?? ''
  const expected = process.env.ADMIN_TOKEN
  if (!expected || token !== expected) {
    redirect('/')
  }

  const sb = getAdmin()

  const [intentRows, starterRows, msgRows] = await Promise.all([
    sb.rpc('admin_intencao_counts').then(r => (r.data ?? []) as IntencaoRow[]),
    sb.rpc('admin_starter_counts').then(r => (r.data ?? []) as StarterRow[]),
    sb
      .from('conversations')
      .select('created_at, starter_usado, intencao_detectada, primeira_mensagem')
      .not('primeira_mensagem', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(r => (r.data ?? []) as MensagemRow[]),
  ])

  // Fallback: if RPCs don't exist yet, run direct queries
  const intencoes: IntencaoRow[] = intentRows.length
    ? intentRows
    : await sb
        .from('conversations')
        .select('intencao_detectada')
        .not('intencao_detectada', 'is', null)
        .then(r => {
          const counts: Record<string, number> = {}
          for (const row of (r.data ?? []) as { intencao_detectada: string }[]) {
            counts[row.intencao_detectada] = (counts[row.intencao_detectada] ?? 0) + 1
          }
          return Object.entries(counts)
            .map(([intencao_detectada, total]) => ({ intencao_detectada, total }))
            .sort((a, b) => b.total - a.total)
        })

  const starters: StarterRow[] = starterRows.length
    ? starterRows
    : await sb
        .from('conversations')
        .select('starter_usado')
        .not('primeira_mensagem', 'is', null)
        .then(r => {
          const counts: Record<string, number> = {}
          for (const row of (r.data ?? []) as { starter_usado: string | null }[]) {
            const key = row.starter_usado ?? 'livre'
            counts[key] = (counts[key] ?? 0) + 1
          }
          return Object.entries(counts)
            .map(([starter, total]) => ({ starter, total }))
            .sort((a, b) => b.total - a.total)
        })

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-sm text-gray-800">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h1 className="text-2xl font-bold text-gray-900">Intenções — Turaquete Admin</h1>

        {/* Intenções */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Por intenção</h2>
          <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Intenção</th>
                <th className="text-right px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {intencoes.map(r => (
                <tr key={r.intencao_detectada} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono">{r.intencao_detectada}</td>
                  <td className="px-4 py-2 text-right font-semibold">{r.total}</td>
                </tr>
              ))}
              {intencoes.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-3 text-gray-400 italic">Sem dados ainda.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Starters */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Starters usados</h2>
          <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Starter</th>
                <th className="text-right px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {starters.map(r => (
                <tr key={r.starter ?? 'livre'} className="border-t border-gray-100">
                  <td className="px-4 py-2">{r.starter ?? <span className="italic text-gray-400">livre (digitou)</span>}</td>
                  <td className="px-4 py-2 text-right font-semibold">{r.total}</td>
                </tr>
              ))}
              {starters.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-3 text-gray-400 italic">Sem dados ainda.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Últimas 50 mensagens */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Últimas 50 primeiras mensagens</h2>
          <div className="flex flex-col gap-2">
            {msgRows.map((r, i) => (
              <div key={i} className="bg-white rounded-lg px-4 py-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-1">
                  <span>{new Date(r.created_at).toLocaleString('pt-BR')}</span>
                  {r.starter_usado && <span className="bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium">{r.starter_usado}</span>}
                  {r.intencao_detectada && <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">{r.intencao_detectada}</span>}
                </div>
                <p className="text-gray-800 leading-snug">{r.primeira_mensagem}</p>
              </div>
            ))}
            {msgRows.length === 0 && (
              <p className="text-gray-400 italic">Sem dados ainda. Execute a migration SQL primeiro.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
