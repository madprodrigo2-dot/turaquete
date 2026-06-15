import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { id, affiliate_url } = body as { id?: unknown; affiliate_url?: unknown }

  if (typeof id !== 'number') {
    return NextResponse.json({ error: 'id deve ser número' }, { status: 400 })
  }

  const url = typeof affiliate_url === 'string' ? affiliate_url.trim() : null

  if (url) {
    if (!url.startsWith('http')) {
      return NextResponse.json({ error: 'URL inválida — deve começar com http' }, { status: 400 })
    }
    try { new URL(url) } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }
  }

  const { error } = await getAdmin()
    .from('rackets')
    .update({ affiliate_url: url || null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, affiliate_url: url || null })
}
