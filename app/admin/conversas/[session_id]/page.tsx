import { notFound, redirect } from 'next/navigation'
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

type Msg = { role: 'user' | 'assistant'; content: string }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export default async function ConversaDetailPage({
  params,
}: {
  params: Promise<{ session_id: string }>
}) {
  const { session_id } = await params

  const session = await auth()
  if (!session?.user?.email?.endsWith('@gmail.com') &&
      session?.user?.email !== 'madprodrigo@gmail.com') {
    redirect('/admin/login')
  }

  const sb = getAdmin()

  // Fetch all snapshots for this session, ordered by time
  const { data: rows } = await sb
    .from('conversations')
    .select('*')
    .eq('session_id', session_id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!rows || rows.length === 0) notFound()

  const row = rows[0]
  const messages: Msg[] = Array.isArray(row.messages) ? row.messages as Msg[] : []

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <Link
            href="/admin/conversas"
            className="text-xs text-gray-400 hover:text-teal-600 transition-colors"
          >
            ← Conversas
          </Link>
          <h1 className="text-sm font-semibold text-gray-900 mt-1 font-mono break-all">
            {session_id}
          </h1>
          <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(row.created_at)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 text-[10px] text-gray-400">
          {row.is_test && (
            <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-medium">teste</span>
          )}
          {row.custo_brl > 0 && (
            <span>R$ {Number(row.custo_brl).toFixed(4)}</span>
          )}
          {row.starter_usado && (
            <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded">{row.starter_usado}</span>
          )}
          {row.intencao_detectada && (
            <span className="text-gray-500">{row.intencao_detectada}</span>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-teal-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 italic">Sem mensagens registradas.</p>
        )}
      </div>

      {/* Profile + recs (if any) */}
      {row.profile && Object.keys(row.profile).length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Perfil capturado</p>
          <pre className="text-xs text-gray-600 overflow-x-auto">{JSON.stringify(row.profile, null, 2)}</pre>
        </div>
      )}

      {row.recommended_racket_ids && (row.recommended_racket_ids as number[]).length > 0 && (
        <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Raquetes recomendadas</p>
          <p className="text-xs text-gray-600 font-mono">IDs: {(row.recommended_racket_ids as number[]).join(', ')}</p>
        </div>
      )}
    </div>
  )
}
