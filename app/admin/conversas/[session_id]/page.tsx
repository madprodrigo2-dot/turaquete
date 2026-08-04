import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

const MESSAGE_LIMIT = 25 // must match HomeClient.tsx

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2 font-semibold">
      {children}
    </p>
  )
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      {children}
    </div>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="text-xs">
      <span className="text-gray-400">{label}: </span>
      <span className={`text-gray-700 font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function MissingNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-gray-400 leading-relaxed mt-2">
      <span className="text-amber-600 font-semibold">Não persistido</span>
      {' — '}{children}
    </p>
  )
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

  const [{ data: rows }, { data: recEvents }, { data: waEvents }] = await Promise.all([
    sb.from('conversations')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: false }),
    sb.from('recommendation_events')
      .select('racket_id, confidence, rank, created_at')
      .eq('conversation_id', session_id)
      .order('rank', { ascending: true }),
    sb.from('feedback_events')
      .select('event_type, created_at, motivo')
      .eq('session_id', session_id)
      .in('event_type', ['whatsapp_shown', 'whatsapp_click', 'compartilhar_click'])
      .order('created_at', { ascending: true }),
  ])

  if (!rows || rows.length === 0) notFound()

  const row = rows[0]
  const messages: Msg[] = Array.isArray(row.messages) ? row.messages as Msg[] : []
  const msgCount = messages.length
  const cierreAtingido = msgCount >= MESSAGE_LIMIT
  const waShown = (waEvents ?? []).some(e => e.event_type === 'whatsapp_shown')
  const waClicked = (waEvents ?? []).some(e => e.event_type === 'whatsapp_click')
  const waClickedAt = (waEvents ?? []).find(e => e.event_type === 'whatsapp_click')?.created_at
  const compartilharClicked = (waEvents ?? []).some(e => e.event_type === 'compartilhar_click')
  const compartilharEv = (waEvents ?? []).find(e => e.event_type === 'compartilhar_click')
  const compartilharSlug = compartilharEv?.motivo ?? null
  const compartilharAt = compartilharEv?.created_at ?? null

  // All unique recommended racket IDs across rows (fallback when no rec events)
  const allRecIds = [...new Set(
    rows.flatMap(r =>
      Array.isArray(r.recommended_racket_ids)
        ? (r.recommended_racket_ids as (string | number)[]).map(Number)
        : []
    ).filter(id => id > 0)
  )]

  const allRacketIds = [...new Set([
    ...(recEvents ?? []).map(e => e.racket_id as number),
    ...allRecIds,
  ])]

  const { data: rackets } = allRacketIds.length > 0
    ? await sb.from('rackets').select('id, name, slug').in('id', allRacketIds)
    : { data: [] }

  const byId = Object.fromEntries((rackets ?? []).map(r => [r.id as number, r as { id: number; name: string; slug: string }]))

  const profile = (row.profile ?? {}) as Record<string, unknown>
  const hasOrcamento = profile.orcamento_raw || profile.orcamento_min != null

  return (
    <div className="max-w-2xl flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/conversas" className="text-xs text-gray-400 hover:text-teal-600 transition-colors">
            ← Conversas
          </Link>
          <h1 className="text-sm font-semibold text-gray-900 mt-1 font-mono break-all">{session_id}</h1>
          <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(row.created_at)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 text-[10px]">
          {row.is_test && <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-medium">teste</span>}
          {row.custo_brl > 0 && <span className="text-gray-400">R$ {Number(row.custo_brl).toFixed(4)}</span>}
          <span className="text-gray-400">{msgCount} msgs · {rows.length} turns</span>
          {row.starter_usado && <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded">{row.starter_usado}</span>}
          {row.intencao_detectada && <span className="text-gray-500">{row.intencao_detectada}</span>}
        </div>
      </div>

      {/* ── Perfil capturado ── */}
      <Block>
        <SectionTitle>Perfil capturado</SectionTitle>
        <div className="flex flex-col gap-1">
          {row.intencao_detectada   && <KV label="Intenção"      value={row.intencao_detectada} />}
          {row.starter_usado        && <KV label="Starter"       value={row.starter_usado} />}
          {row.primeira_mensagem    && <KV label="1ª mensagem"   value={row.primeira_mensagem} />}
          {hasOrcamento             && <KV label="Orçamento"     value={String(profile.orcamento_raw ?? `R$${profile.orcamento_min}–${profile.orcamento_max}`)} />}
          {row.utm_source           && <KV label="UTM source"    value={row.utm_source} />}
          {row.utm_medium           && <KV label="UTM medium"    value={row.utm_medium} />}
          {row.referrer             && <KV label="Referrer"      value={row.referrer} />}
          {row.ip_hash              && <KV label="IP hash"       value={row.ip_hash} mono />}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-[10px] text-gray-500 font-semibold mb-1">Perfil do motor (não persistido)</p>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Estilo · Nível · Lesão · Faixa de peso · Balance · Atributos priorizados e pesos:
            <span className="text-amber-600 ml-1">calculados em runtime pelo scorer, não gravados no DB.</span>
            {' '}Para auditar: abra o Debug Panel (⚙) no chat como admin e replique a conversa.
          </p>
        </div>
      </Block>

      {/* ── Recomendações com confidence ── */}
      {(recEvents && recEvents.length > 0) ? (
        <Block>
          <SectionTitle>Recomendações — motor ({recEvents.length} raquetes)</SectionTitle>
          <div className="flex flex-col gap-2">
            {recEvents.map(e => {
              const r = byId[e.racket_id as number]
              const conf = e.confidence != null ? Number(e.confidence) : null
              return (
                <div key={`${e.racket_id}-${e.rank}`} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[10px] text-gray-300 w-4 shrink-0">#{e.rank}</span>
                  {r ? (
                    <Link href={`/raquetes/${r.slug}`} target="_blank" className="text-teal-700 hover:underline font-medium flex-1 min-w-0 truncate">
                      {r.name}
                    </Link>
                  ) : (
                    <span className="text-gray-400 italic flex-1">ID {e.racket_id}</span>
                  )}
                  {conf != null ? (
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                      conf >= 7.5 ? 'bg-green-50 text-green-700' :
                      conf >= 6.5 ? 'bg-yellow-50 text-yellow-700' :
                                    'bg-red-50 text-red-600'
                    }`}>
                      conf {conf.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-300 shrink-0">conf —</span>
                  )}
                </div>
              )
            })}
          </div>
          <MissingNote>
            Scorer breakdown e decision_trace (por que cada raquete entrou vs. foi excluída): calculado em runtime, não gravado.
            Disponível no Debug Panel ao vivo.
          </MissingNote>
        </Block>
      ) : allRecIds.length > 0 ? (
        <Block>
          <SectionTitle>Raquetes recomendadas (sem dados de confiança)</SectionTitle>
          <div className="flex flex-col gap-1">
            {allRecIds.map(id => {
              const r = byId[id]
              return (
                <div key={id} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-gray-300 w-8 shrink-0">{id}</span>
                  {r ? (
                    <Link href={`/raquetes/${r.slug}`} target="_blank" className="text-teal-700 hover:underline">{r.name}</Link>
                  ) : (
                    <span className="text-gray-400 italic">ID não encontrado</span>
                  )}
                </div>
              )
            })}
          </div>
        </Block>
      ) : null}

      {/* ── Cierre & WhatsApp ── */}
      <Block>
        <SectionTitle>Cierre & WhatsApp</SectionTitle>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
              cierreAtingido ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {cierreAtingido ? '🔔 Cierre atingido' : '— Cierre nao atingido'}
            </span>
            <span className="text-[10px] text-gray-400">{msgCount} / {MESSAGE_LIMIT} mensagens</span>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-20 shrink-0">WA exibido:</span>
              {waShown
                ? <span className="text-green-700 font-semibold">Sim</span>
                : <span className="text-gray-400">Nao</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-20 shrink-0">WA clicado:</span>
              {waClicked
                ? <span className="text-green-700 font-semibold">
                    Sim{waClickedAt ? <span className="text-gray-400 font-normal ml-1">({fmtDate(waClickedAt)})</span> : null}
                  </span>
                : waShown
                  ? <span className="text-gray-400">Nao clicou</span>
                  : <span className="text-gray-300">—</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-20 shrink-0">Compartilhou:</span>
              {compartilharClicked
                ? <span className="text-green-700 font-semibold">
                    Sim
                    {compartilharSlug && <span className="text-gray-400 font-normal ml-1">· {compartilharSlug}</span>}
                    {compartilharAt && <span className="text-gray-400 font-normal ml-1">({fmtDate(compartilharAt)})</span>}
                  </span>
                : <span className="text-gray-300">—</span>}
            </div>
          </div>
        </div>
      </Block>

      {/* ── Transcript ── */}
      <div>
        <SectionTitle>Transcript</SectionTitle>
        <div className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-teal-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-xs text-gray-400 italic">Sem mensagens registradas.</p>
          )}
        </div>
      </div>

    </div>
  )
}
