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

  const { id, price, touch } = body as { id?: unknown; price?: unknown; touch?: unknown }

  if (typeof id !== 'number') {
    return NextResponse.json({ error: 'id deve ser número' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // touch=true: only refreshes price_updated_at, doesn't change the price
  if (touch === true) {
    const { error } = await getAdmin()
      .from('rackets')
      .update({ price_updated_at: now })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, touched: true, price_updated_at: now })
  }

  if (typeof price !== 'number' || price <= 0 || !isFinite(price)) {
    return NextResponse.json({ error: 'Preço inválido' }, { status: 400 })
  }

  const { error } = await getAdmin()
    .from('rackets')
    .update({ price, price_updated_at: now, price_source: 'manual' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, price, price_updated_at: now })
}
