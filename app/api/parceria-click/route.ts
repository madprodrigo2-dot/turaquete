import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import { checkEventsRateLimit } from '@/lib/rate-limit'
import { auth } from '@/auth'

// Cliques em links de parceria (ex: MegaSpin) — mesma tabela/tipo usado para o
// afiliado ML (link_clicks.tipo), mas sem redirect próprio: o link vai direto
// pro WhatsApp do parceiro, então o registro precisa vir do cliente via beacon
// em vez do fluxo server-side de /ir/[slug].
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

    const { racket_id, slug, destination_url } = body

    if (typeof racket_id !== 'number' || typeof slug !== 'string' || !slug) {
      return NextResponse.json({ error: 'racket_id/slug inválidos' }, { status: 400 })
    }
    if (typeof destination_url !== 'string' || !destination_url.startsWith('https://api.whatsapp.com/')) {
      return NextResponse.json({ error: 'destination_url inválida' }, { status: 400 })
    }

    // Fire-and-forget — never blocks the caller
    getSupabaseAdmin()
      .from('link_clicks')
      .insert({
        racket_id,
        slug,
        tipo:             'parceria',
        destination_type: 'megaspin',
        destination_url,
        is_test:          isTest,
        referrer:         req.headers.get('referer') ?? null,
        user_agent:       req.headers.get('user-agent') ?? null,
      })
      .then(({ error }) => { if (error) console.error('link_clicks insert (parceria):', error.message) })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'parse error' }, { status: 400 })
  }
}
