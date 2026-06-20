import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import { checkEventsRateLimit } from '@/lib/rate-limit'
import { auth } from '@/auth'

const VALID_TYPES = new Set([
  'rating_positive',
  'rating_negative',
  'ver_na_loja',
  'ver_analise',
  'nova_conversa_pos_rec',
])

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  if (!checkEventsRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const [body, session, cookieStore] = await Promise.all([
      req.json() as Promise<Record<string, unknown>>,
      auth(),
      cookies(),
    ])
    const isAdmin = session?.user?.email === process.env.ADMIN_EMAIL
    const isTest  = isAdmin || cookieStore.get('turaquete_test_mode')?.value === '1'

    const { event_type, session_id, motivo, comentario, decision_trace, intencao, turnos_ate_recomendacao, racket_id } = body

    if (typeof event_type !== 'string' || !VALID_TYPES.has(event_type)) {
      return NextResponse.json({ error: 'event_type inválido' }, { status: 400 })
    }
    if (typeof session_id !== 'string' || !session_id) {
      return NextResponse.json({ error: 'session_id obrigatório' }, { status: 400 })
    }

    // Fire-and-forget — never blocks the caller
    getSupabaseAdmin()
      .from('feedback_events')
      .insert({
        session_id,
        event_type,
        is_test:                  isTest,
        motivo:                   typeof motivo === 'string'                   ? motivo : null,
        comentario:               typeof comentario === 'string'               ? comentario.slice(0, 1000) : null,
        decision_trace:           decision_trace != null                        ? decision_trace : null,
        intencao:                 typeof intencao === 'string'                  ? intencao : null,
        turnos_ate_recomendacao:  typeof turnos_ate_recomendacao === 'number'   ? turnos_ate_recomendacao : null,
        racket_id:                typeof racket_id === 'number'                 ? racket_id : null,
      })
      .then(({ error }) => { if (error) console.error('feedback_events insert:', error.message) })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'parse error' }, { status: 400 })
  }
}
