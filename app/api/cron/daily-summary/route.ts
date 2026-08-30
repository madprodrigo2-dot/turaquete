import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

const MONETIZABLE_THRESHOLD = 3

function brtRange() {
  const now = new Date()
  const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const brtToday = new Date(brtNow)
  brtToday.setUTCHours(0, 0, 0, 0)
  const brtYesterday = new Date(brtToday.getTime() - 86400_000)
  const from = new Date(brtYesterday.getTime() + 3 * 60 * 60 * 1000).toISOString()
  const to = new Date(brtToday.getTime() + 3 * 60 * 60 * 1000).toISOString()
  // from = meia-noite BRT em UTC → exibe corretamente como dia anterior
  const label = new Date(from).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
  // Primeiro dia do mês BRT corrente em UTC
  const monthFrom = new Date(
    Date.UTC(brtToday.getUTCFullYear(), brtToday.getUTCMonth(), 1) + 3 * 60 * 60 * 1000
  ).toISOString()
  return { from, to, label, monthFrom }
}


export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { from, to, label, monthFrom } = brtRange()

  const [convsRes, recsRes, clicksRes, afiliRes, ipRes, externalRes, afiliMesRes, precoQuebradoRes, semMatchRes] = await Promise.all([
    sb.from('conversations').select('session_id, custo_brl').gte('created_at', from).lt('created_at', to).eq('is_test', false),
    sb.from('recommendation_events').select('racket_id').gte('created_at', from).lt('created_at', to).eq('is_test', false),
    sb.from('link_clicks').select('id', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to).eq('is_test', false).not('session_id', 'is', null),
    sb.from('link_clicks').select('id', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to).eq('is_test', false).eq('tipo', 'afiliado').not('session_id', 'is', null),
    sb.from('link_clicks').select('ip_hash, pais').gte('created_at', from).lt('created_at', to).eq('is_test', false).not('ip_hash', 'is', null),
    sb.from('link_clicks').select('pais').gte('created_at', from).lt('created_at', to).eq('is_test', false).is('session_id', null),
    sb.from('link_clicks').select('id', { count: 'exact', head: true }).gte('created_at', monthFrom).lt('created_at', to).eq('is_test', false).eq('tipo', 'afiliado').not('session_id', 'is', null),
    // Snapshot atual (não só o que rodou hoje no sync) — pega raquetes publicadas/ativas travadas em preço.
    sb.from('rackets').select('id, name').eq('publicada', true).not('is_active', 'eq', false).not('fora_de_linha', 'eq', true).in('last_sync_status', ['no_price', 'error_429', 'timeout', 'error']),
    sb.from('feedback_events').select('motivo').eq('event_type', 'busca_sem_match').gte('created_at', from).lt('created_at', to).eq('is_test', false),
  ])

  const convs = convsRes.data ?? []
  const recs = recsRes.data ?? []
  const totalClicks = clicksRes.count ?? 0
  const totalAfiliado = afiliRes.count ?? 0
  const totalAfiliaoMes = afiliMesRes.count ?? 0
  const precosQuebrados = precoQuebradoRes.data ?? []

  const externalRows = externalRes.data ?? []
  const externalCount = externalRows.length
  const externalPaisCounts: Record<string, number> = {}
  for (const row of externalRows) {
    if (row.pais) externalPaisCounts[row.pais] = (externalPaisCounts[row.pais] ?? 0) + 1
  }
  const topExternalPais = Object.entries(externalPaisCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const totalSessoes = new Set(convs.map(c => c.session_id)).size
  const totalRecs = recs.length
  const custoBRL = convs.reduce((s, c) => s + (c.custo_brl ?? 0), 0)
  const conversionRate = totalRecs > 0 ? Math.round((totalAfiliado / totalRecs) * 100) : null

  const semMatchRows = semMatchRes.data ?? []
  const semMatchCount = semMatchRows.length
  const semMatchMotivoCounts: Record<string, number> = {}
  for (const row of semMatchRows) {
    const motivo = row.motivo ?? 'não informado'
    semMatchMotivoCounts[motivo] = (semMatchMotivoCounts[motivo] ?? 0) + 1
  }
  const topSemMatchMotivo = Object.entries(semMatchMotivoCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const ipCounts: Record<string, { count: number; pais: string | null }> = {}
  for (const row of (ipRes.data ?? [])) {
    if (!row.ip_hash) continue
    if (!ipCounts[row.ip_hash]) ipCounts[row.ip_hash] = { count: 0, pais: row.pais ?? null }
    ipCounts[row.ip_hash].count++
  }
  const suspiciousOrigins = Object.values(ipCounts).filter(e => e.count > 10)
  const topOrigin = suspiciousOrigins.sort((a, b) => b.count - a.count)[0] ?? null

  // Top rackets
  const recCounts: Record<number, number> = {}
  for (const e of recs) recCounts[e.racket_id] = (recCounts[e.racket_id] ?? 0) + 1
  const topIds = Object.entries(recCounts).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5).map(([id]) => Number(id))
  const allRecommendedIds = Object.keys(recCounts).map(Number)

  let topLines = ''
  let semAfiliadoLine = ''
  if (allRecommendedIds.length > 0) {
    const { data: racketInfo } = await sb.from('rackets').select('id, name, affiliate_url').in('id', allRecommendedIds)
    const nameMap = Object.fromEntries((racketInfo ?? []).map(r => [r.id, r.name]))
    topLines = topIds.map((id, i) => `  ${i + 1}. ${nameMap[id] ?? `id ${id}`} (${recCounts[id]}x)`).join('\n')

    // Plata dejada na mesa: raquete recomendada hoje que nem tem link de afiliado.
    const semAfiliado = (racketInfo ?? []).filter(r => !r.affiliate_url)
    if (semAfiliado.length > 0) {
      const shown = semAfiliado.slice(0, 5).map(r => `${r.name} (${recCounts[r.id]}x)`)
      const extra = semAfiliado.length - shown.length
      semAfiliadoLine = `🚫 Recomendada sem link de afiliado: ${shown.join(', ')}${extra > 0 ? ` e mais ${extra}` : ''}`
    }
  }

  const hasDados = totalSessoes > 0 || totalRecs > 0

  const monetizableLine = totalAfiliado >= MONETIZABLE_THRESHOLD
    ? `💵 Ontem: <b>${totalAfiliado}</b> cliques monetizáveis. Vale conferir vendas no painel ML (atualiza a cada 24h).`
    : ''
  const mesLine = `📅 Mês corrente: <b>${totalAfiliaoMes}</b> cliques monetizáveis`

  const precoQuebradoLine = precosQuebrados.length > 0
    ? `⚠️ <b>${precosQuebrados.length}</b> raquete(s) com preço quebrado agora: ${precosQuebrados.slice(0, 5).map(r => r.name).join(', ')}${precosQuebrados.length > 5 ? ` e mais ${precosQuebrados.length - 5}` : ''}`
    : ''

  const semMatchLine = semMatchCount > 0
    ? `🔍 <b>${semMatchCount}</b> conversa(s) sem raquete encontrada${topSemMatchMotivo ? ` (motivo mais comum: ${topSemMatchMotivo})` : ''}`
    : ''

  const text = [
    `🎾 <b>Turaquete — ${label}</b>`,
    '',
    hasDados ? [
      `💬 Conversas: <b>${totalSessoes}</b>`,
      `🎯 Recomendações: <b>${totalRecs}</b>`,
      `🔗 Cliques totais: <b>${totalClicks}</b>`,
      `🛒 Cliques afiliado: <b>${totalAfiliado}</b>${conversionRate !== null ? ` (${conversionRate}% de conversão)` : ''}`,
      `💸 Custo API: <b>R$ ${custoBRL.toFixed(2)}</b>`,
    ].join('\n') : '(sem atividade ontem)',
    monetizableLine,
    mesLine,
    precoQuebradoLine,
    semAfiliadoLine,
    semMatchLine,
    externalCount > 0 ? `🤖 Acessos externos: <b>${externalCount}</b>${topExternalPais ? ` (top: ${topExternalPais})` : ''}` : '',
    topIds.length > 0 ? `\n🏆 Mais recomendadas:\n${topLines}` : '',
    topOrigin ? `\n⚠️ ${suspiciousOrigins.length} origem(ns) com +10 clics/dia (top: ${topOrigin.count} clics, país ${topOrigin.pais ?? '?'})` : '',
  ].filter(Boolean).join('\n')

  await sendTelegram(text)

  return NextResponse.json({
    ok: true, label, totalSessoes, totalRecs, totalAfiliado, conversionRate,
    precosQuebrados: precosQuebrados.length, semMatch: semMatchCount,
  })
}
