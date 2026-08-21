import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import AdminPeriodFilter from '../AdminPeriodFilter'
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
  intencao_tags: string[] | null
  has_sem_match: boolean
  primeira_mensagem: string | null
  custo_brl: number
  custo_usd: number
  is_test: boolean
  turn_count: number
  had_rec: boolean
  had_click: boolean
  had_retry: boolean
  rating: 'positive' | 'negative' | null
  ip_hash: string | null
  ip_session_count: number
  utm_source: string | null
  utm_medium: string | null
  referrer: string | null
  rec_racket_names: string[]
  wa_shown: boolean
  wa_click: boolean
  orcamento_label: string | null
  nivel: string | null
}

const NIVEL_CONFIG: Record<string, { label: string; cls: string }> = {
  iniciante:      { label: 'Iniciante',     cls: 'bg-emerald-50 text-emerald-700' },
  intermediario:  { label: 'Intermediário', cls: 'bg-amber-50 text-amber-700' },
  avancado:       { label: 'Avançado',      cls: 'bg-red-50 text-red-700' },
}

const TAG_CONFIG: Record<string, { emoji: string; label: string; cls: string }> = {
  'primeira_raquete': { emoji: '🎯', label: 'primeira',   cls: 'bg-blue-50 text-blue-700' },
  'upgrade_tecnico':  { emoji: '⚡', label: 'upgrade',    cls: 'bg-purple-50 text-purple-700' },
  'resolver_dor':     { emoji: '🩺', label: 'dor',        cls: 'bg-red-50 text-red-700' },
  'indefinido':       { emoji: '❓', label: 'indefinido', cls: 'bg-gray-50 text-gray-400' },
  'ticket_alto':      { emoji: '💰', label: 'R$2k+',      cls: 'bg-amber-50 text-amber-700' },
  'indeciso':         { emoji: '🔄', label: 'indeciso',   cls: 'bg-gray-100 text-gray-600' },
  'sem_match:faixa':   { emoji: '⚠️', label: 'sem/faixa',  cls: 'bg-orange-50 text-orange-700' },
  'sem_match:orcamento': { emoji: '⚠️', label: 'sem/orç', cls: 'bg-orange-50 text-orange-700' },
  'sem_match:marca':   { emoji: '⚠️', label: 'sem/marca', cls: 'bg-orange-50 text-orange-700' },
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
    .select('session_id, created_at, starter_usado, intencao_detectada, intencao_tags, primeira_mensagem, custo_brl, custo_usd, is_test, messages, recommended_racket_ids, ip_hash, utm_source, utm_medium, referrer')
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
  const sessionUtmSource = new Map<string, string>()
  const sessionUtmMedium = new Map<string, string>()
  const sessionReferrer = new Map<string, string>()
  const sessionRecIds = new Map<string, Set<number>>()
  for (const r of raw) {
    sessionCostMap.set(r.session_id, (sessionCostMap.get(r.session_id) ?? 0) + (Number(r.custo_brl) || 0))
    if (Array.isArray(r.recommended_racket_ids) && r.recommended_racket_ids.length > 0) {
      sessionHadRecMap.set(r.session_id, true)
      const ids = sessionRecIds.get(r.session_id) ?? new Set<number>()
      for (const id of r.recommended_racket_ids) ids.add(Number(id))
      sessionRecIds.set(r.session_id, ids)
    }
    if (!sessionIpMap.has(r.session_id) && r.ip_hash) {
      sessionIpMap.set(r.session_id, r.ip_hash)
    }
    if (!sessionUtmSource.has(r.session_id) && r.utm_source) sessionUtmSource.set(r.session_id, r.utm_source)
    if (!sessionUtmMedium.has(r.session_id) && r.utm_medium) sessionUtmMedium.set(r.session_id, r.utm_medium)
    if (!sessionReferrer.has(r.session_id) && r.referrer) sessionReferrer.set(r.session_id, r.referrer)
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
      intencao_tags: (r as { intencao_tags?: string[] | null }).intencao_tags ?? null,
      has_sem_match: false,
      primeira_mensagem: r.primeira_mensagem,
      custo_brl: sessionCostMap.get(r.session_id) ?? 0,
      custo_usd: Number(r.custo_usd ?? 0),
      is_test: !!r.is_test,
      turn_count: userTurns,
      had_rec: hadRec,
      had_click: false,
      had_retry: false,
      rating: null,
      wa_shown: false,
      wa_click: false,
      ip_hash: sessionIpMap.get(r.session_id) ?? null,
      ip_session_count: 0,
      utm_source: sessionUtmSource.get(r.session_id) ?? null,
      utm_medium: sessionUtmMedium.get(r.session_id) ?? null,
      referrer: sessionReferrer.get(r.session_id) ?? null,
      rec_racket_names: [],
      orcamento_label: null,
      nivel: null,
    })
    if (sessions.length >= 50) break
  }
  for (const s of sessions) {
    if (s.ip_hash) s.ip_session_count = ipSessionCount.get(s.ip_hash) ?? 1
  }

  // Second query: fetch FIRST row per session to get turn-1 metadata
  // Also fetches the most recent non-null intencao_tags per session — rec turns don't carry
  // confirmedProfile so their intencao_tags is null; the correct tags come from earlier turns.
  const sessionIds = sessions.map(s => s.session_id)
  if (sessionIds.length > 0) {
    const [{ data: firstRows }, { data: intencaoRows }, { data: intencaoTagRows }, { data: profileRows }, { data: confirmedProfileRows }] = await Promise.all([
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
      // DESC order so we get the most-refined tags (profile questions come before rec turns)
      sb.from('conversations')
        .select('session_id, intencao_tags')
        .in('session_id', sessionIds)
        .not('intencao_tags', 'is', null)
        .order('created_at', { ascending: false })
        .limit(sessionIds.length * 6),
      // Faixa de preço — mesmo problema: rec turns não carregam orçamento, então
      // pega o mais recente entre todos os turnos que efetivamente tem o dado.
      sb.from('conversations')
        .select('session_id, profile')
        .in('session_id', sessionIds)
        .not('profile', 'is', null)
        .order('created_at', { ascending: false })
        .limit(sessionIds.length * 6),
      // Nível/categoria — mesmo padrão: confirmed_profile de um rec turn pode vir
      // sem nivel (só com o que sobreviveu daquele turno específico).
      sb.from('conversations')
        .select('session_id, confirmed_profile')
        .in('session_id', sessionIds)
        .not('confirmed_profile', 'is', null)
        .order('created_at', { ascending: false })
        .limit(sessionIds.length * 6),
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

    // Override intencao_tags from last row (which is a rec turn with null tags)
    // with the most recent row that has a meaningful intent tag.
    if (intencaoTagRows) {
      const tagsMap = new Map<string, string[]>()
      for (const r of intencaoTagRows) {
        if (tagsMap.has(r.session_id)) continue
        const tags = r.intencao_tags as string[] | null
        if (!tags || tags.length === 0) continue
        // Skip 'indefinido'-only — that's the starter-turn placeholder before profile is known
        if (tags.length === 1 && tags[0] === 'indefinido') continue
        tagsMap.set(r.session_id, tags)
      }
      for (const s of sessions) {
        const current = s.intencao_tags
        const isBlank = !current || current.length === 0 || (current.length === 1 && current[0] === 'indefinido')
        if (isBlank) {
          const tags = tagsMap.get(s.session_id)
          if (tags) s.intencao_tags = tags
        }
      }
    }

    if (profileRows) {
      const orcamentoMap = new Map<string, string>()
      for (const r of profileRows) {
        if (orcamentoMap.has(r.session_id)) continue
        const p = r.profile as { orcamento_label?: string | null } | null
        if (!p?.orcamento_label) continue
        orcamentoMap.set(r.session_id, p.orcamento_label)
      }
      for (const s of sessions) {
        const label = orcamentoMap.get(s.session_id)
        if (label) s.orcamento_label = label
      }
    }

    if (confirmedProfileRows) {
      const nivelMap = new Map<string, string>()
      for (const r of confirmedProfileRows) {
        if (nivelMap.has(r.session_id)) continue
        const cp = r.confirmed_profile as { nivel?: string | null } | null
        if (!cp?.nivel) continue
        nivelMap.set(r.session_id, cp.nivel)
      }
      for (const s of sessions) {
        const nivel = nivelMap.get(s.session_id)
        if (nivel) s.nivel = nivel
      }
    }
  }

  // Fetch racket names for all recommended rackets across sessions
  const allRecIds = [...new Set([...sessionRecIds.values()].flatMap(s => [...s]))]
  if (allRecIds.length > 0) {
    const { data: racketRows } = await sb.from('rackets').select('id, name').in('id', allRecIds)
    const racketNameMap = new Map<number, string>((racketRows ?? []).map(r => [r.id, r.name]))
    for (const s of sessions) {
      const ids = sessionRecIds.get(s.session_id)
      if (ids) s.rec_racket_names = [...ids].map(id => racketNameMap.get(id) ?? `#${id}`)
    }
  }

  // Query: fetch ver_na_loja clicks, timeout_retry, rating, WA and sem_match events per session
  if (sessionIds.length > 0) {
    const [{ data: clickRows }, { data: retryRows }, { data: ratingRows }, { data: waRows }, { data: semMatchRows }] = await Promise.all([
      sb.from('feedback_events').select('session_id').in('session_id', sessionIds).eq('event_type', 'ver_na_loja'),
      sb.from('feedback_events').select('session_id').in('session_id', sessionIds).eq('event_type', 'timeout_retry'),
      sb.from('feedback_events').select('session_id, event_type').in('session_id', sessionIds).in('event_type', ['rating_positive', 'rating_negative']),
      sb.from('feedback_events').select('session_id, event_type').in('session_id', sessionIds).in('event_type', ['whatsapp_shown', 'whatsapp_click']),
      sb.from('feedback_events').select('session_id, motivo').in('session_id', sessionIds).eq('event_type', 'busca_sem_match'),
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
    if (ratingRows) {
      const ratingMap = new Map<string, 'positive' | 'negative'>()
      for (const r of ratingRows) {
        if (!ratingMap.has(r.session_id)) {
          ratingMap.set(r.session_id, r.event_type === 'rating_positive' ? 'positive' : 'negative')
        }
      }
      for (const s of sessions) {
        s.rating = ratingMap.get(s.session_id) ?? null
      }
    }
    if (waRows) {
      const waShownSet = new Set(waRows.filter(r => r.event_type === 'whatsapp_shown').map(r => r.session_id))
      const waClickSet = new Set(waRows.filter(r => r.event_type === 'whatsapp_click').map(r => r.session_id))
      for (const s of sessions) {
        if (waShownSet.has(s.session_id)) s.wa_shown = true
        if (waClickSet.has(s.session_id)) s.wa_click = true
      }
    }
    if (semMatchRows) {
      // Merge sem_match cause into intencao_tags (cumulative — feedback_events persists across turns)
      const semMatchMap = new Map<string, string>()
      for (const r of semMatchRows) {
        if (!semMatchMap.has(r.session_id)) semMatchMap.set(r.session_id, r.motivo ?? 'unknown')
      }
      for (const s of sessions) {
        const causa = semMatchMap.get(s.session_id)
        if (causa) {
          s.has_sem_match = true
          const semTag = `sem_match:${causa}`
          if (s.intencao_tags && !s.intencao_tags.includes(semTag)) {
            s.intencao_tags = [...s.intencao_tags, semTag]
          }
        }
      }
    }
  }

  const KNOWN_STARTERS = ['Ataque (potência, smash)', 'Defesa e controle', 'Equilibrado']

  const waShownCount = sessions.filter(s => s.wa_shown).length
  const waClickCount = sessions.filter(s => s.wa_click).length
  const waRate = waShownCount > 0 ? Math.round((waClickCount / waShownCount) * 100) : null

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

      {waShownCount > 0 && (
        <div className="mb-4 flex items-center gap-3 flex-wrap text-xs">
          <span className="font-semibold text-gray-700">📱 WhatsApp</span>
          <span className="text-gray-500">{waShownCount} conversas viram o botão</span>
          <span className="text-green-700 font-semibold">{waClickCount} clicaram</span>
          {waRate !== null && (
            <span className={`font-mono px-1.5 py-0.5 rounded text-[11px] ${waRate >= 20 ? 'bg-green-50 text-green-700' : waRate >= 10 ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
              {waRate}% CTR
            </span>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-400">
              <th className="text-left px-3 py-2">Data (BRT)</th>
              <th className="text-left px-3 py-2">Starter / Primeira msg</th>
              <th className="text-left px-3 py-2">
                <span className="flex items-center gap-1">
                  Intenção
                  <span className="relative group cursor-default">
                    <span className="text-[9px] text-gray-300 border border-gray-200 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center hover:text-gray-500 hover:border-gray-400 leading-none select-none">?</span>
                    <div className="absolute left-0 top-5 z-50 hidden group-hover:block w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-[11px] text-gray-600 leading-relaxed font-normal normal-case tracking-normal whitespace-normal">
                      <p className="font-semibold text-gray-800 mb-2 text-[11px]">Principal (1 obrigatória, prioridade ↓)</p>
                      <div className="space-y-1 mb-3">
                        <p><span className="text-red-700 font-semibold">🩺 dor</span> — lesão = true (ombro/cotovelo/punho), qualquer nível</p>
                        <p><span className="text-blue-700 font-semibold">🎯 primeira</span> — nível = iniciante E sem lesão</p>
                        <p><span className="text-purple-700 font-semibold">⚡ upgrade</span> — nível = intermediário ou avançado E sem lesão</p>
                        <p><span className="text-gray-400 font-semibold">❓ indefinido</span> — nível não capturado (usuário saiu antes)</p>
                      </div>
                      <p className="font-semibold text-gray-800 mb-1 text-[11px]">Modificadores (0 a N)</p>
                      <div className="space-y-1">
                        <p><span className="text-amber-700 font-semibold">💰 R$2k+</span> — orçamento mínimo ≥ R$ 2.000</p>
                        <p><span className="text-gray-600 font-semibold">🔄 indeciso</span> — clicou &quot;Ver mais opções&quot; ≥ 2×</p>
                        <p><span className="text-orange-700 font-semibold">⚠️ sem/faixa</span> — pediu faixa de preço sem match no catálogo</p>
                        <p><span className="text-orange-700 font-semibold">⚠️ sem/orç</span> — opções existem mas acima do limite</p>
                      </div>
                    </div>
                  </span>
                </span>
              </th>
              <th className="text-left px-3 py-2">Faixa de preço</th>
              <th className="text-left px-3 py-2">Nível</th>
              <th className="text-center px-3 py-2">Turnos</th>
              <th className="text-right px-3 py-2">Custo</th>
              <th className="text-center px-3 py-2">Rec?</th>
              <th className="text-left px-3 py-2">Raquetes rec.</th>
              <th className="text-center px-3 py-2">Loja?</th>
              <th className="text-center px-3 py-2" title="Usuário clicou em 'Tentar de novo' após timeout">↻?</th>
              <th className="text-center px-3 py-2" title="Feedback do usuário">👍👎</th>
              <th className="text-center px-3 py-2" title="WhatsApp: 📱=viu botão, ✓=clicou">WA</th>
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
                  {(() => {
                    const chipText = s.starter_usado ?? (KNOWN_STARTERS.includes(s.primeira_mensagem ?? '') ? s.primeira_mensagem : null)
                    return chipText ? (
                      <span className="bg-teal-50 text-teal-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
                        {chipText}
                      </span>
                    ) : (
                      <span className="text-gray-600 truncate block">
                        {s.primeira_mensagem ?? <span className="text-gray-300 italic">—</span>}
                      </span>
                    )
                  })()}
                </td>
                <td className="px-3 py-2">
                  {s.intencao_tags && s.intencao_tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {s.intencao_tags.map(tag => {
                        const cfg = TAG_CONFIG[tag]
                        return cfg ? (
                          <span key={tag} className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.cls}`}>
                            {cfg.emoji} {cfg.label}
                          </span>
                        ) : (
                          <span key={tag} className="text-[10px] text-gray-400 px-1 rounded bg-gray-50">{tag}</span>
                        )
                      })}
                    </div>
                  ) : s.intencao_detectada ? (
                    <span className="text-[10px] text-gray-400">{s.intencao_detectada}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 max-w-[140px]">
                  {s.orcamento_label ? (
                    <span className="text-gray-600 truncate block">{s.orcamento_label}</span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2">
                  {s.nivel ? (
                    (() => {
                      const cfg = NIVEL_CONFIG[s.nivel]
                      return cfg ? (
                        <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.cls}`}>{cfg.label}</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">{s.nivel}</span>
                      )
                    })()
                  ) : <span className="text-gray-300">—</span>}
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
                <td className="px-3 py-2 max-w-[200px]">
                  {s.rec_racket_names.length > 0 ? (
                    <span className="text-gray-600 text-[10px] leading-relaxed">
                      {s.rec_racket_names.join(', ')}
                    </span>
                  ) : <span className="text-gray-200">—</span>}
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
                <td className="px-3 py-2 text-center">
                  {s.rating === 'positive'
                    ? <span title="me ajudou">👍</span>
                    : s.rating === 'negative'
                    ? <span title="não era isso">👎</span>
                    : <span className="text-gray-200">—</span>}
                </td>
                <td className="px-3 py-2 text-center text-xs">
                  {s.wa_click
                    ? <span className="text-green-600 font-bold" title="Clicou no WhatsApp">✓</span>
                    : s.wa_shown
                    ? <span className="text-gray-400" title="Viu o botao, nao clicou">📱</span>
                    : <span className="text-gray-200">—</span>}
                </td>
                <td className="px-3 py-2 text-center font-mono">
                  {s.ip_hash ? (
                    <span
                      title={`hash: ${s.ip_hash}`}
                      className={s.ip_session_count >= 3 ? 'text-red-500 font-bold' : 'text-gray-300'}
                    >
                      {s.ip_session_count >= 2 ? `×${s.ip_session_count}` : '·'}
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
