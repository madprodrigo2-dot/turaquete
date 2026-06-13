import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { auth, signOut } from '@/auth'
import { USD_TO_BRL } from '@/lib/agent/pricing'

export const dynamic = 'force-dynamic'

interface IntencaoRow { intencao_detectada: string | null; total: number }
interface StarterRow  { starter: string | null; total: number }
interface MensagemRow {
  created_at: string
  starter_usado: string | null
  intencao_detectada: string | null
  primeira_mensagem: string | null
}
interface CostRow {
  created_at: string
  custo_brl: number | null
  recommended_racket_ids: number[] | null
}

function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function fmtBrl(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
}

function fmtBrlShort(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export default async function IntencoesAdmin() {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login')
  }

  const sb = getAdmin()

  const now = Date.now()
  const ago30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ago7  = new Date(now -  7 * 24 * 60 * 60 * 1000).toISOString()

  const [intentRows, starterRows, msgRows, costRows] = await Promise.all([
    sb.rpc('admin_intencao_counts').then(r => (r.data ?? []) as IntencaoRow[]),
    sb.rpc('admin_starter_counts').then(r => (r.data ?? []) as StarterRow[]),
    sb
      .from('conversations')
      .select('created_at, starter_usado, intencao_detectada, primeira_mensagem')
      .not('primeira_mensagem', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(r => (r.data ?? []) as MensagemRow[]),
    sb
      .from('conversations')
      .select('created_at, custo_brl, recommended_racket_ids')
      .not('custo_brl', 'is', null)
      .gte('created_at', ago30)
      .then(r => (r.data ?? []) as CostRow[]),
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

  // ── Cost stats ────────────────────────────────────────────────────────────
  const costs30 = costRows.map(r => r.custo_brl!).filter(v => v > 0)
  const costs7  = costRows
    .filter(r => r.created_at >= ago7)
    .map(r => r.custo_brl!)
    .filter(v => v > 0)

  const costsWithRec = costRows
    .filter(r => (r.recommended_racket_ids?.length ?? 0) > 0)
    .map(r => r.custo_brl!)
    .filter(v => v > 0)

  const avg30        = avg(costs30)
  const avg7         = avg(costs7)
  const total30      = costs30.reduce((a, b) => a + b, 0)
  const avgWithRec   = avg(costsWithRec)
  const maxCost      = costs30.length > 0 ? Math.max(...costs30) : null

  const hasCostData = costs30.length > 0

  // Estimated commision per sale — fill in when affiliate % is known
  const COMISSAO_ESTIMADA_BRL: number | null = null  // e.g. 120 for ~5% of R$2.400

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-sm text-gray-800">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Intenções</h1>
            <p className="text-gray-400 text-xs mt-0.5">Turaquete Admin · {session.user?.email}</p>
          </div>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/admin/login' })
            }}
          >
            <button
              type="submit"
              className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>

        {/* ── Custos ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Custos (API Anthropic)</h2>

          {!hasCostData ? (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm px-4 py-3 text-gray-400 italic text-xs">
              Sem dados de custo ainda. Execute a migration SQL e aguarde novas conversas.
            </div>
          ) : (
            <>
              {/* Número estrela */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 flex flex-col gap-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Custo médio por recomendação exibida (30d)</p>
                <p className="text-3xl font-bold text-gray-900">
                  {avgWithRec != null ? fmtBrl(avgWithRec) : '—'}
                </p>
                {COMISSAO_ESTIMADA_BRL != null && avgWithRec != null && (
                  <p className="text-xs text-gray-400 mt-1">
                    Comissão estimada por venda: {fmtBrlShort(COMISSAO_ESTIMADA_BRL)}
                    {' · '}
                    <span className={avgWithRec < COMISSAO_ESTIMADA_BRL * 0.1 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                      margem {((COMISSAO_ESTIMADA_BRL - avgWithRec) / COMISSAO_ESTIMADA_BRL * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
                {COMISSAO_ESTIMADA_BRL == null && (
                  <p className="text-xs text-gray-300 mt-1">
                    Preencha <code className="font-mono">COMISSAO_ESTIMADA_BRL</code> no código para ver a margem.
                  </p>
                )}
              </div>

              {/* Grade de métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Custo médio / conversa (7d)', value: avg7 != null ? fmtBrl(avg7) : '—', sub: `${costs7.length} conv.` },
                  { label: 'Custo médio / conversa (30d)', value: avg30 != null ? fmtBrl(avg30) : '—', sub: `${costs30.length} conv.` },
                  { label: 'Custo total (30d)', value: fmtBrlShort(total30), sub: `USD ${(total30 / USD_TO_BRL).toFixed(4)}` },
                  { label: 'Conversa mais cara (30d)', value: maxCost != null ? fmtBrl(maxCost) : '—', sub: 'anomalias' },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
                    <p className="text-base font-bold text-gray-800">{value}</p>
                    <p className="text-[10px] text-gray-300">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Contexto de negócio */}
              <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
                <span className="font-semibold">Referência:</span> ticket médio ~R$2.000–2.400 · comissão afiliado ML ~5–8% → R$100–192/venda.
                {' '}Preencha <code className="font-mono">COMISSAO_ESTIMADA_BRL</code> em <code className="font-mono">app/admin/intencoes/page.tsx</code> quando souber o % exato.
              </div>
            </>
          )}
        </section>

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
