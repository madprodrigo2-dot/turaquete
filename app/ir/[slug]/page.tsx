import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getRaquetaPorSlug } from '@/lib/recommend'
import { getSupabaseAdmin } from '@/lib/supabase'
import { headers } from 'next/headers'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

// _ga cookie format: GA1.X.XXXXXXXXXX.XXXXXXXXXX — client_id is the last two segments
function gaClientId(raw: string | undefined): string {
  if (!raw) return ''
  const parts = raw.split('.')
  return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : ''
}

// Sends a "click_comprar" event to GA4 via Measurement Protocol (server-side).
// Uses NEXT_PUBLIC_GA_ID (measurement_id) + GA4_API_SECRET.
// Errors are swallowed — must never affect the redirect.
async function sendGa4ClickEvent(opts: {
  clientId: string
  slug: string
  racketName: string
  tipo: 'afiliado' | 'oficial'
  price: number | null
  currency: string | null
}) {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID
  const apiSecret     = process.env.GA4_API_SECRET
  if (!measurementId || !apiSecret) return

  const eventParams: Record<string, unknown> = {
    racket_slug: opts.slug,
    racket_name: opts.racketName,
    link_type:   opts.tipo,
  }
  if (opts.price) {
    eventParams.value    = opts.price
    eventParams.currency = opts.currency ?? 'BRL'
  }

  await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: opts.clientId,
        events: [{ name: 'click_comprar', params: eventParams }],
      }),
    }
  )
}

export default async function IrPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ s?: string }>
}) {
  const [{ slug }, sp, hdrs, session, cookieStore] = await Promise.all([params, searchParams, headers(), auth(), cookies()])
  const isAdmin = session?.user?.email === process.env.ADMIN_EMAIL
  const isTest  = isAdmin || cookieStore.get('turaquete_test_mode')?.value === '1'
  const racket = await getRaquetaPorSlug(slug)

  if (!racket) notFound()

  const ctaUrl = racket.affiliate_url ?? racket.source_url ?? null
  if (!ctaUrl) notFound()

  const tipo: 'afiliado' | 'oficial' = racket.affiliate_url ? 'afiliado' : 'oficial'
  const destination_type = racket.affiliate_url
    ? 'ml'
    : ctaUrl.includes('mercadolivre.com.br')
      ? 'ml'
      : 'oficial'

  const clientId = gaClientId(cookieStore.get('_ga')?.value)

  // DB insert and GA4 event run concurrently; Promise.allSettled swallows both errors
  await Promise.allSettled([
    getSupabaseAdmin()
      .from('link_clicks')
      .insert({
        racket_id: racket.id,
        slug,
        tipo,
        destination_type,
        destination_url: ctaUrl,
        is_test:         isTest,
        session_id: sp.s ?? null,
        referrer: hdrs.get('referer') ?? null,
        user_agent: hdrs.get('user-agent') ?? null,
      }),
    !isTest && clientId
      ? sendGa4ClickEvent({
          clientId,
          slug,
          racketName: racket.name,
          tipo,
          price:    racket.price ? Number(racket.price) : null,
          currency: racket.currency ?? 'BRL',
        })
      : Promise.resolve(),
  ])

  redirect(ctaUrl)
}
