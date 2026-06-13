import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { auth, signOut } from '@/auth'
import { USD_TO_BRL } from '@/lib/agent/pricing'

export const dynamic = 'force-dynamic'

interface IntencaoRow   { intencao_detectada: string | null; total: number }
interface StarterRow    { starter: string | null; total: number }
interface MensagemRow   {
  created_at: string
  starter_usado: string | null
  intencao_detectada: string | null
  primeira_mensagem: string | null
}
interface SessionCostRow {
  session_id:    string
  total_brl:     number
  total_usd:     number
  turns:         number
  had_rec:       boolean
  first_turn_at: string
}
interface ClickRow {
  session_id: string
  event_type: string
  created_at: string
}

// ── Ajustar quando tiver dados reais do Mercado Livre ──────────────────────
// Exemplo: comissão de 5% sobre ticket médio R$2.400 → R$120
const COMISSAO_ESTIMADA_BRL: number | null = null
// Exemplo: 5% dos cliques no botão "Ver na loja" resultam em venda → 0.05
const TAXA_CLIQUE_TO_VENDA: number | null = null

function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function fmtBrl(v: number, decimals = 4): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

function fmtUsd(v: number): string {
  return `US$ ${v.toFixed(4)}`
}

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function pct(num: number, den: number): string {
  if (den === 0) return '—'
  return `${Math.round((num / den) * 100)}%`
}

export default async function IntencoesAdmin() {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login')
  }

  const sb = getAdmin()

  const now   = Date.now()
  const ago30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ago7  = new Date(now -  7 * 24 * 60 * 60 * 1000).toISOString()
  const ago1  = new Date(now -  1 * 24 * 60 * 60 * 1000).toISOString()

  const [intentRows, starterRows, msgRows, sessionCostRows, clickRows] = await Promise.all([
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
      .rpc('admin_cost_by_session', { days_back: 30 })
      .then(r => (r.data ?? []) as SessionCostRow[]),
    sb
      .from('feedback_events')
      .select('session_id, event_type, created_at')
      .in('event_type', ['ver_na_loja', 'ver_analise'])
      .gte('created_at', ago30)
      .then(r => (r.data ?? []) as ClickRow[]),
  ])

  // Fallback se RPCs ainda não existirem
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

  // ── Cost stats ─────────────────────────────────────────────────────────────
  // Cada row = uma sessão (múltiplos turnos já agregados pela RPC)
  const sessions30 = sessionCostRows.filter(r => r.total_brl > 0)
  const sessions7  = sessions30.filter(r => r.first_turn_at >= ago7)
  const sessions1  = sessions30.filter(r => r.first_turn_at >= ago1)

  const avg30    = avg(sessions30.map(r => r.total_brl))
  const avg7     = avg(sessions7.map(r => r.total_brl))
  const avg1     = avg(sessions1.map(r => r.total_brl))
  const avg30Usd = avg(sessions30.map(r => r.total_usd))
  const avg7Usd  = avg(sessions7.map(r => r.total_usd))
  const avg1Usd  = avg(sessions1.map(r => r.total_usd))

  const total30Brl = sessions30.reduce((a, r) => a + r.total_brl, 0)
  const total7Brl  = sessions7.reduce((a, r) => a + r.total_brl, 0)
  const total30Usd = sessions30.reduce((a, r) => a + r.total_usd, 0)
  const total7Usd  = sessions7.reduce((a, r) => a + r.total_usd, 0)

  const maxCost = sessions30.length > 0 ? Math.max(...sessions30.map(r => r.total_brl)) : null

  const avgTurns30       = avg(sessions30.map(r => r.turns))
  const avgCostPerTurn30 = avg30 != null && avgTurns30 != null && avgTurns30 > 0
    ? avg30 / avgTurns30
    : null

  const hasCostData = sessions30.length > 0

  // ── Click cross-reference ──────────────────────────────────────────────────
  const allClickSessionIds      = new Set(clickRows.map(r => r.session_id))
  const affiliateClickEvents    = clickRows.filter(r => r.event_type === 'ver_na_loja')
  const numAffiliateClickEvents = affiliateClickEvents.length

  const sessionsWithClick    = sessions30.filter(r => allClickSessionIds.has(r.session_id))
  const taxaConversaoClique  = sessions30.length > 0
    ? sessionsWithClick.length / sessions30.length
    : 0

  // custo total 30d / nº eventos de clique afiliado
  const custoPorClique = numAffiliateClickEvents > 0
    ? total30Brl / numAffiliateClickEvents
    : null

  // ── Ponto de equilíbrio ────────────────────────────────────────────────────
  const pontoEquilibrio = COMISSAO_ESTIMADA_BRL != null && avg30 != null && avg30 > 0
    ? Math.round(COMISSAO_ESTIMADA_BRL / avg30)
    : null

  // Receita estimada por conversa (quando ambas as constantes estiverem preenchidas)
  const receitaEstimadaPorConv =
    COMISSAO_ESTIMADA_BRL != null && TAXA_CLIQUE_TO_VENDA != null && sessions30.length > 0
      ? COMISSAO_ESTIMADA_BRL * taxaConversaoClique * TAXA_CLIQUE_TO_VENDA
      : null

  const isAboveEquilibrio =
    receitaEstimadaPorConv != null && avg30 != null
      ? receitaEstimadaPorConv >= avg30
      : null

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-sm text-gray-800">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Intenções</h1>
            <p className="text-gray-400 text-xs mt-0.5">Turaquete Admin · {session.user?.email}</p>
          </div>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/admin/login' }) }}>
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
              Sair
            </button>
          </form>
        </div>

        {/* ── Custos — Métricas Base ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Custos (API Anthropic)</h2>

          {!hasCostData ? (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm px-4 py-3 text-gray-400 italic text-xs">
              Sem dados de custo ainda. Execute a migration SQL e aguarde novas conversas.
            </div>
          ) : (
            <>
              {/* Três janelas temporais */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {([
                  { label: 'Custo médio / conversa — hoje',    brl: avg1,  usd: avg1Usd,  n: sessions1.length,  star: false },
                  { label: 'Custo médio / conversa — 7 dias',  brl: avg7,  usd: avg7Usd,  n: sessions7.length,  star: false },
                  { label: 'Custo médio / conversa — 30 dias', brl: avg30, usd: avg30Usd, n: sessions30.length, star: true  },
                ] as { label: string; brl: number | null; usd: number | null; n: number; star: boolean }[]).map(({ label, brl, usd, n, star }) => (
                  <div key={label} className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1 ${star ? 'border-aqua/30' : 'border-gray-100'}`}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
                    <p className={`font-bold text-gray-900 ${star ? 'text-2xl' : 'text-lg'}`}>
                      {brl != null ? fmtBrl(brl) : '—'}
                    </p>
                    {usd != null && <p className="text-[11px] text-gray-400">{fmtUsd(usd)}</p>}
                    <p className="text-[10px] text-gray-300">{n} conv.</p>
                  </div>
                ))}
              </div>

              {/* Métricas secundárias */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Custo total — 7 dias',      value: fmtBrl(total7Brl, 2),  sub: fmtUsd(total7Usd) },
                  { label: 'Custo total — 30 dias',     value: fmtBrl(total30Brl, 2), sub: fmtUsd(total30Usd) },
                  { label: 'Conversa mais cara (30d)',   value: maxCost != null ? fmtBrl(maxCost) : '—', sub: 'detectar anomalias' },
                  {
                    label: 'Custo médio / turno (30d)',
                    value: avgCostPerTurn30 != null ? fmtBrl(avgCostPerTurn30) : '—',
                    sub: avgTurns30 != null ? `≈ ${avgTurns30.toFixed(1)} turnos/conv` : '',
                  },
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

        {/* ── Custos — Rentabilidade ── */}
        {hasCostData && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Rentabilidade</h2>
            <div className="flex flex-col gap-3">

              {/* Cliques */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">Taxa de conversão a clique (30d)</p>
                  <p className="text-base font-bold text-gray-800">{pct(sessionsWithClick.length, sessions30.length)}</p>
                  <p className="text-[10px] text-gray-300">{sessionsWithClick.length} de {sessions30.length} conv. clicaram em loja ou análise</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">Custo por clique afiliado gerado (30d)</p>
                  <p className="text-base font-bold text-gray-800">{custoPorClique != null ? fmtBrl(custoPorClique) : '—'}</p>
                  <p className="text-[10px] text-gray-300">{numAffiliateClickEvents} cliques &ldquo;Ver na loja&rdquo; · custo total / nº cliques</p>
                </div>
              </div>

              {/* Ponto de equilíbrio */}
              <div className={`rounded-xl border px-5 py-4 ${
                isAboveEquilibrio === true  ? 'bg-emerald-50 border-emerald-200' :
                isAboveEquilibrio === false ? 'bg-amber-50 border-amber-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Ponto de equilíbrio</p>

                {COMISSAO_ESTIMADA_BRL == null ? (
                  <p className="text-xs text-gray-400 italic">
                    Estimativa — preencher dado real do ML.{' '}
                    Defina <code className="font-mono bg-gray-100 px-1 rounded">COMISSAO_ESTIMADA_BRL</code> em{' '}
                    <code className="font-mono bg-gray-100 px-1 rounded">app/admin/intencoes/page.tsx</code>.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-4 flex-wrap">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">1 comissão cobre</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {pontoEquilibrio != null ? `${pontoEquilibrio.toLocaleString('pt-BR')} conv.` : '—'}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          comissão estimada: {fmtBrl(COMISSAO_ESTIMADA_BRL, 2)} · custo médio: {avg30 != null ? fmtBrl(avg30) : '—'}/conv
                        </p>
                      </div>

                      {receitaEstimadaPorConv != null && avg30 != null && (
                        <div className={`ml-auto px-3 py-2 rounded-lg text-sm font-semibold ${
                          isAboveEquilibrio ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isAboveEquilibrio ? 'Acima do ponto ✓' : 'Abaixo do ponto'}
                          <p className="text-[11px] font-normal mt-0.5">
                            receita est. {fmtBrl(receitaEstimadaPorConv)} vs custo {fmtBrl(avg30)} / conv
                          </p>
                        </div>
                      )}
                    </div>

                    {TAXA_CLIQUE_TO_VENDA == null ? (
                      <p className="text-xs text-gray-400 italic mt-1">
                        Para ver acima/abaixo do ponto: defina{' '}
                        <code className="font-mono bg-gray-100 px-1 rounded">TAXA_CLIQUE_TO_VENDA</code>{' '}
                        (ex: <code className="font-mono">0.05</code> para 5% de clique → venda).
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400">
                        taxa clique→venda: {(TAXA_CLIQUE_TO_VENDA * 100).toFixed(1)}% ·
                        taxa conv→clique: {pct(sessionsWithClick.length, sessions30.length)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-gray-300 px-1">
                Referência: ticket médio ~R$2.000–2.400 · comissão afiliado ML ~5–8% → R$100–192/venda
              </p>
            </div>
          </section>
        )}

        {/* ── Intenções ── */}
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

        {/* ── Starters ── */}
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

        {/* ── Últimas 50 primeiras mensagens ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Últimas 50 primeiras mensagens</h2>
          <div className="flex flex-col gap-2">
            {msgRows.map((r, i) => (
              <div key={i} className="bg-white rounded-lg px-4 py-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-1">
                  <span>{new Date(r.created_at).toLocaleString('pt-BR')}</span>
                  {r.starter_usado && (
                    <span className="bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium">{r.starter_usado}</span>
                  )}
                  {r.intencao_detectada && (
                    <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">{r.intencao_detectada}</span>
                  )}
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
