import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { autorizadoAfiliado } from '@/lib/affiliateAuth'

export const dynamic = 'force-dynamic'

/**
 * Guarda no servidor o "último id de venda de afiliado ML já notificado", para a tarefa agendada
 * (que roda fora deste repo e não tem memória entre execuções) saber se a venda é nova.
 * Tabela app_state (key text PK, value text, updated_at; RLS ligado, só service_role acessa); chave: affiliate_ml_last_sale_id.
 *
 * Auth: igual a /api/admin/notify-affiliate-sale (ver lib/affiliateAuth.ts).
 * GET  -> { id: string | null }
 * POST -> body { id: string } grava e devolve { ok: true, id }
 */
const KEY = 'affiliate_ml_last_sale_id'

export async function GET(req: Request) {
  if (!autorizadoAfiliado(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await getSupabaseAdmin()
    .from('app_state').select('value').eq('key', KEY).maybeSingle()
  if (error) {
    console.error('[affiliate-last-seen] leitura falhou:', error.message)
    return NextResponse.json({ error: 'Falha ao ler estado' }, { status: 500 })
  }
  return NextResponse.json({ id: data?.value ?? null })
}

export async function POST(req: Request) {
  if (!autorizadoAfiliado(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const raw = (body as { id?: unknown } | null)?.id
  const id = typeof raw === 'string' ? raw.trim() : typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : ''
  if (!id || id.length > 100) {
    return NextResponse.json({ error: 'id é obrigatório (texto, até 100 caracteres)' }, { status: 400 })
  }

  const { error } = await getSupabaseAdmin()
    .from('app_state').upsert({ key: KEY, value: id, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) {
    console.error('[affiliate-last-seen] gravação falhou:', error.message)
    return NextResponse.json({ error: 'Falha ao gravar estado' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id })
}
