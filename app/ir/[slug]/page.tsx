import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getRaquetaPorSlug } from '@/lib/recommend'
import { getSupabaseAdmin } from '@/lib/supabase'
import { headers } from 'next/headers'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

// _ga cookie format: GA1.X.XXXXXXXXXX.XXXXXXXXXX — client_id is the last two segments.
// Falls back to a random UUID so the event is always sent even without the cookie.
function gaClientId(raw: string | undefined): string {
  if (raw) {
    const parts = raw.split('.')
    if (parts.length >= 4) return `${parts[2]}.${parts[3]}`
  }
  return crypto.randomUUID()
}

function summarizeReferrer(ref: string | null): string {
  if (!ref) return 'direto'
  try {
    const path = new URL(ref).pathname
    if (path === '/' || path === '') return 'agente'
    if (path.startsWith('/raquetes/')) return 'página da raquete'
    if (path === '/raquetes') return 'catálogo'
    if (path.startsWith('/comparar')) return 'comparar'
    return path.slice(1, 24)
  } catch {
    return 'direto'
  }
}

// Sends a Telegram notification to the owner on every real buy click.
async function sendTelegramNotification(opts: {
  racketName: string
  tipo: 'afiliado' | 'oficial'
  price: number | null
  nivel: string | null
  utmSource: string | null
  utmMedium: string | null
  referrer: string | null
}) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const emoji  = opts.tipo === 'afiliado' ? '💰' : '🔗'
  const preco  = opts.price
    ? `R$${opts.price.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
    : 'sem preço'
  const nivelMap: Record<string, string> = { iniciante: 'iniciante', intermediario: 'intermediário', avancado: 'avançado' }
  const nivel  = opts.nivel ? (nivelMap[opts.nivel] ?? opts.nivel) : '—'

  let via = 'direto'
  if (opts.utmSource) {
    via = opts.utmMedium ? `${opts.utmSource}/${opts.utmMedium}` : opts.utmSource
  } else if (opts.referrer) {
    via = opts.referrer
  }

  const text   = `${emoji} Clique em Comprar\n${opts.racketName}\n${opts.tipo} · ${preco} · ${nivel}\nvia ${via}`

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
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
    racket_slug:          opts.slug,
    racket_name:          opts.racketName,
    link_type:            opts.tipo,
    engagement_time_msec: 1,
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
  const ua      = hdrs.get('user-agent') ?? ''
  const isBot   = /bot|crawler|spider|google|bing|baidu|yandex|facebook|slurp|preview/i.test(ua)
  const isTest  = isAdmin || isBot || cookieStore.get('turaquete_test_mode')?.value === '1'

  // Fetch racket + session origin concurrently
  const sessionId = sp.s ?? null
  const [racket, sessionOrigin] = await Promise.all([
    getRaquetaPorSlug(slug),
    sessionId
      ? getSupabaseAdmin()
          .from('conversations')
          .select('utm_source, utm_medium, referrer')
          .eq('session_id', sessionId)
          .not('utm_source', 'is', null)
          .limit(1)
          .maybeSingle()
          .then(({ data }) => data ?? null)
      : Promise.resolve(null),
  ])

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

  const price = racket.price ? Number(racket.price) : null

  // DB insert, GA4 event and Telegram notification run concurrently
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
    !isTest
      ? sendGa4ClickEvent({
          clientId,
          slug,
          racketName: racket.name,
          tipo,
          price,
          currency: racket.currency ?? 'BRL',
        })
      : Promise.resolve(),
    !isTest
      ? sendTelegramNotification({
          racketName: racket.name,
          tipo,
          price,
          nivel: racket.racket_insights?.nivel_sugerido ?? null,
          utmSource: sessionOrigin?.utm_source ?? null,
          utmMedium: sessionOrigin?.utm_medium ?? null,
          referrer:  sessionOrigin?.referrer ?? null,
        })
      : Promise.resolve(),
  ])

  redirect(ctaUrl)
}
