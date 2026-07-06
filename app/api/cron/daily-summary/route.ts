import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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
  return { from, to, label }
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados')
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telegram error: ${err}`)
  }
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

  const { from, to, label } = brtRange()

  const [convsRes, recsRes, clicksRes, afiliRes] = await Promise.all([
    sb.from('conversations').select('session_id, custo_brl').gte('created_at', from).lt('created_at', to).eq('is_test', false),
    sb.from('recommendation_events').select('racket_id').gte('created_at', from).lt('created_at', to).eq('is_test', false),
    sb.from('link_clicks').select('id', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to).eq('is_test', false),
    sb.from('link_clicks').select('id', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to).eq('is_test', false).eq('tipo', 'afiliado'),
  ])

  const convs = convsRes.data ?? []
  const recs = recsRes.data ?? []
  const totalClicks = clicksRes.count ?? 0
  const totalAfiliado = afiliRes.count ?? 0
  const totalSessoes = new Set(convs.map(c => c.session_id)).size
  const totalRecs = recs.length
  const custoBRL = convs.reduce((s, c) => s + (c.custo_brl ?? 0), 0)

  // Top rackets
  const recCounts: Record<number, number> = {}
  for (const e of recs) recCounts[e.racket_id] = (recCounts[e.racket_id] ?? 0) + 1
  const topIds = Object.entries(recCounts).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5).map(([id]) => Number(id))

  let topLines = ''
  if (topIds.length > 0) {
    const { data: racketNames } = await sb.from('rackets').select('id, name').in('id', topIds)
    const nameMap = Object.fromEntries((racketNames ?? []).map(r => [r.id, r.name]))
    topLines = topIds.map((id, i) => `  ${i + 1}. ${nameMap[id] ?? `id ${id}`} (${recCounts[id]}x)`).join('\n')
  }

  const hasDados = totalSessoes > 0 || totalRecs > 0

  const text = [
    `🎾 <b>Turaquete — ${label}</b>`,
    '',
    hasDados ? [
      `💬 Sessões: <b>${totalSessoes}</b>`,
      `🎯 Recomendações: <b>${totalRecs}</b>`,
      `🔗 Cliques totais: <b>${totalClicks}</b>`,
      `🛒 Cliques afiliado: <b>${totalAfiliado}</b>`,
      `💸 Custo API: <b>R$ ${custoBRL.toFixed(2)}</b>`,
    ].join('\n') : '(sem atividade ontem)',
    topIds.length > 0 ? `\n🏆 Mais recomendadas:\n${topLines}` : '',
  ].filter(Boolean).join('\n')

  await sendTelegram(text)

  return NextResponse.json({ ok: true, label, totalSessoes, totalRecs, totalAfiliado })
}
