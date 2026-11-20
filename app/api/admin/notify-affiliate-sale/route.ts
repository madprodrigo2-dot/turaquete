import { NextResponse } from 'next/server'
import { autorizadoAfiliado } from '@/lib/affiliateAuth'
import { sendTelegram } from '@/lib/telegram'
import { montarMensagemVenda } from '@/lib/affiliateSaleMessage'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/notify-affiliate-sale
 * Avisa por Telegram (mesmo bot/chat do resto do site) uma venda de afiliado do Mercado Livre.
 * Quem chama: a tarefa agendada que lê o painel de afiliados do ML (roda fora deste repo).
 *
 * Auth: Authorization: Bearer <AFFILIATE_NOTIFY_SECRET>; se essa env não existir, usa CRON_SECRET
 * (mesmo padrão dos crons). Sem nenhuma das duas configurada, o endpoint recusa tudo.
 *
 * Body JSON: { id, fecha|data, produto, tienda|loja, venta|venda, comision|comissao, estado|status }
 * Só `id` é obrigatório; o resto é opcional e vai em texto simples (escapado). Nada é gravado em banco.
 */

// Aceita string ou número; corta em 200 caracteres.
function campo(body: Record<string, unknown>, ...chaves: string[]): string | null {
  for (const k of chaves) {
    const v = body[k]
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 200)
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return null
}

export async function POST(req: Request) {
  if (!autorizadoAfiliado(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Decodifica o corpo como UTF-8 estrito. Se vier em outra codificação (cliente que manda bytes
  // Windows-1252/Latin-1, ex.: curl no Windows), cai para Windows-1252 em vez de gravar "�" no texto.
  let body: unknown
  try {
    const bytes = await req.arrayBuffer()
    let txt: string
    try { txt = new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
    catch { txt = new TextDecoder('windows-1252').decode(bytes) }
    body = JSON.parse(txt)
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const b = body as Record<string, unknown>

  const id = campo(b, 'id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  const texto = montarMensagemVenda({
    id,
    produto: campo(b, 'produto', 'product'),
    loja: campo(b, 'tienda', 'loja'),
    venda: campo(b, 'venta', 'venda'),
    comissao: campo(b, 'comision', 'comissao', 'comisión', 'comissão'),
    data: campo(b, 'fecha', 'data'),
    status: campo(b, 'estado', 'status'),
  })

  try {
    await sendTelegram(texto)
  } catch (e) {
    // Só mensagem de erro (sem token/chat). Log para diagnosticar falha de Telegram.
    console.error('[notify-affiliate-sale] Telegram falhou:', e instanceof Error ? e.message.replace(/bot\d+:[\w-]+/g, 'bot<redacted>') : 'erro')
    return NextResponse.json({ ok: false, error: 'Falha ao enviar Telegram' }, { status: 502 })
  }

  console.log('[notify-affiliate-sale] enviado: true')
  return NextResponse.json({ ok: true })
}
