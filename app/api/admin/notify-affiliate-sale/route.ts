import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sendTelegram } from '@/lib/telegram'

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

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function autorizado(req: Request): boolean {
  const secret = process.env.AFFILIATE_NOTIFY_SECRET || process.env.CRON_SECRET
  if (!secret) return false
  const got = Buffer.from(req.headers.get('authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}

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
  if (!autorizado(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const b = body as Record<string, unknown>

  const id = campo(b, 'id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  const linhas: Array<[string, string | null]> = [
    ['Produto', campo(b, 'produto', 'product')],
    ['Loja', campo(b, 'tienda', 'loja', 'tienda')],
    ['Venda', campo(b, 'venta', 'venda')],
    ['Comissão', campo(b, 'comision', 'comissao', 'comisión', 'comissão')],
    ['Data', campo(b, 'fecha', 'data')],
    ['Status', campo(b, 'estado', 'status')],
  ]

  const texto = [
    '💰 <b>Nova venda de afiliado (Mercado Livre)</b>',
    '',
    ...linhas.filter(([, v]) => v).map(([k, v]) => `<b>${k}:</b> ${esc(v as string)}`),
    `<b>ID:</b> <code>${esc(id)}</code>`,
  ].join('\n')

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
