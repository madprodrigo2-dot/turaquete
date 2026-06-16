import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import type { DecisionTrace } from '@/lib/debug-types'

export const dynamic = 'force-dynamic'

interface FeedbackRow {
  id: number
  created_at: string
  session_id: string
  event_type: string
  motivo: string | null
  comentario: string | null
  decision_trace: DecisionTrace | null
  intencao: string | null
  turnos_ate_recomendacao: number | null
  racket_id: number | null
}

function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function pct(num: number, den: number): string {
  if (den === 0) return '—'
  return `${Math.round((num / den) * 100)}%`
}

export default async function QualidadeAdmin() {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login')
  }

  const sb = getAdmin()

  // Graceful fallback if table doesn't exist yet
  const { data: rows, error } = await sb
    .from('feedback_events')
    .select('id, created_at, session_id, event_type, motivo, comentario, decision_trace, intencao, turnos_ate_recomendacao, racket_id')
    .in('event_type', ['rating_positive', 'rating_negative', 'ver_na_loja', 'ver_analise', 'nova_conversa_pos_rec'])
    .order('created_at', { ascending: false })
    .limit(200)

  const tableExists = !error
  const events: FeedbackRow[] = tableExists ? ((rows ?? []) as FeedbackRow[]) : []

  const ratings = events.filter(e => e.event_type === 'rating_positive' || e.event_type === 'rating_negative')
  const positives = ratings.filter(e => e.event_type === 'rating_positive')
  const negatives = ratings.filter(e => e.event_type === 'rating_negative')
  const verLoja   = events.filter(e => e.event_type === 'ver_na_loja')
  const verAnalise = events.filter(e => e.event_type === 'ver_analise')
  const novaConv  = events.filter(e => e.event_type === 'nova_conversa_pos_rec')

  // Motivos breakdown
  const motivoCounts: Record<string, number> = {}
  for (const e of negatives) {
    const key = e.motivo ?? '(sem motivo)'
    motivoCounts[key] = (motivoCounts[key] ?? 0) + 1
  }
  const motivoEntries = Object.entries(motivoCounts).sort((a, b) => b[1] - a[1])

  // By-intencao cross table
  const intencaoMap: Record<string, { pos: number; neg: number }> = {}
  for (const e of ratings) {
    const key = e.intencao ?? '(não registrada)'
    if (!intencaoMap[key]) intencaoMap[key] = { pos: 0, neg: 0 }
    if (e.event_type === 'rating_positive') intencaoMap[key].pos++
    else intencaoMap[key].neg++
  }
  const intencaoEntries = Object.entries(intencaoMap).sort((a, b) => (b[1].pos + b[1].neg) - (a[1].pos + a[1].neg))

  // Average turnos to recommendation
  const turnosValues = ratings.map(e => e.turnos_ate_recomendacao).filter((v): v is number => v !== null)
  const avgTurnos = turnosValues.length > 0
    ? (turnosValues.reduce((a, b) => a + b, 0) / turnosValues.length).toFixed(1)
    : null

  // Free-text "Outro" comments
  const outroComentarios = negatives
    .filter(e => e.motivo === 'Outro' && e.comentario)
    .slice(0, 50)

  // Recent negatives with trace
  const recentNegatives = negatives.slice(0, 20)

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Qualidade das respostas</h1>
        <p className="text-gray-400 text-xs mt-0.5">{session.user?.email}</p>
      </div>

        {!tableExists && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-xs">
            <strong>Tabela não encontrada.</strong> Execute a migration SQL no Supabase antes de usar esta página.
            <pre className="mt-2 bg-amber-100 rounded p-2 overflow-x-auto text-[11px] font-mono whitespace-pre-wrap">{`create table if not exists feedback_events (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  session_id  text not null,
  event_type  text not null,
  motivo      text,
  decision_trace jsonb,
  intencao    text,
  turnos_ate_recomendacao integer,
  racket_id   integer
);
create index if not exists idx_feedback_events_session_id on feedback_events(session_id);
create index if not exists idx_feedback_events_event_type on feedback_events(event_type);
create index if not exists idx_feedback_events_created_at on feedback_events(created_at desc);`}</pre>
          </div>
        )}

        {/* ── Resumo ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Resumo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Ratings recebidos', value: String(ratings.length), sub: `${positives.length} 👍 · ${negatives.length} 👎` },
              { label: '% positivos', value: pct(positives.length, ratings.length), sub: 'de quem avaliou' },
              { label: 'Cliques "Ver na loja"', value: String(verLoja.length), sub: 'sinais implícitos' },
              { label: 'Média de turnos até rec.', value: avgTurnos ?? '—', sub: `${turnosValues.length} amostras` },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
                <p className="text-base font-bold text-gray-800">{value}</p>
                <p className="text-[10px] text-gray-300">{sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">Ver análise completa</p>
              <p className="text-base font-bold text-gray-800">{verAnalise.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">Nova conversa pós-rec</p>
              <p className="text-base font-bold text-gray-800">{novaConv.length}</p>
              <p className="text-[10px] text-gray-300">usuário reiniciou após ver rec</p>
            </div>
          </div>
        </section>

        {/* ── Motivos do 👎 ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Motivos do 👎</h2>
          {motivoEntries.length === 0 ? (
            <p className="text-gray-400 italic text-xs">Sem dados ainda.</p>
          ) : (
            <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Motivo</th>
                  <th className="text-right px-4 py-2">Qtd</th>
                  <th className="text-right px-4 py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {motivoEntries.map(([motivo, count]) => (
                  <tr key={motivo} className="border-t border-gray-100">
                    <td className="px-4 py-2">{motivo}</td>
                    <td className="px-4 py-2 text-right font-semibold">{count}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{pct(count, negatives.length)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ── Comentários livres (Outro) ── */}
        {outroComentarios.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Comentários livres (Outro)</h2>
            <div className="flex flex-col gap-1.5">
              {outroComentarios.map(e => (
                <div key={e.id} className="flex gap-3 items-start text-xs text-gray-600 bg-white rounded-lg border border-gray-100 shadow-sm px-4 py-2.5">
                  <span className="text-gray-300 shrink-0 pt-0.5">{new Date(e.created_at).toLocaleDateString('pt-BR')}</span>
                  <p className="leading-relaxed">{e.comentario}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Por intenção ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Por intenção</h2>
          {intencaoEntries.length === 0 ? (
            <p className="text-gray-400 italic text-xs">Sem dados ainda.</p>
          ) : (
            <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Intenção</th>
                  <th className="text-right px-4 py-2">Total</th>
                  <th className="text-right px-4 py-2">👍</th>
                  <th className="text-right px-4 py-2">👎</th>
                  <th className="text-right px-4 py-2">% positivo</th>
                </tr>
              </thead>
              <tbody>
                {intencaoEntries.map(([intencao, { pos, neg }]) => (
                  <tr key={intencao} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-mono">{intencao}</td>
                    <td className="px-4 py-2 text-right font-semibold">{pos + neg}</td>
                    <td className="px-4 py-2 text-right text-emerald-600">{pos}</td>
                    <td className="px-4 py-2 text-right text-red-400">{neg}</td>
                    <td className="px-4 py-2 text-right">{pct(pos, pos + neg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ── Últimos 👎 ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Últimos 👎</h2>
          {recentNegatives.length === 0 ? (
            <p className="text-gray-400 italic text-xs">Sem dados ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentNegatives.map(e => (
                <div key={e.id} className="bg-white rounded-lg border border-gray-100 shadow-sm px-4 py-3">
                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-2 flex-wrap">
                    <span>{new Date(e.created_at).toLocaleString('pt-BR')}</span>
                    {e.intencao && (
                      <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">{e.intencao}</span>
                    )}
                    {e.motivo && (
                      <span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium">{e.motivo}</span>
                    )}
                    {e.turnos_ate_recomendacao != null && (
                      <span className="text-gray-300">{e.turnos_ate_recomendacao} turnos</span>
                    )}
                  </div>
                  {/* Comentário livre */}
                  {e.comentario && (
                    <blockquote className="border-l-2 border-red-300 pl-3 text-sm text-gray-700 italic leading-relaxed mb-2">
                      {e.comentario}
                    </blockquote>
                  )}
                  {/* Trace */}
                  {e.decision_trace ? (
                    <details className="mt-1">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                        Ver trace de decisão
                      </summary>
                      <pre className="mt-2 bg-gray-50 rounded p-2 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap text-gray-600">
                        {JSON.stringify(e.decision_trace, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Sem trace (conversa sem diagnóstico)</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

    </div>
  )
}
