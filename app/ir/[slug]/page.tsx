import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import { getRaquetaPorSlug } from '@/lib/recommend'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}
import { buildMlSearchUrl, SEARCH_FALLBACK_UNCOVERED } from '@/lib/ml-search'
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

// _ga_STREAM_ID cookie format: GS1.1.<session_id>.<session_number>... or GS2.1...
// Returns null when absent or malformed — caller omits session params in that case.
function gaSessionInfo(raw: string | undefined): { session_id: string; session_number: number } | null {
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length < 4) return null
  if (parts[0] !== 'GS1' && parts[0] !== 'GS2') return null
  const session_id     = parts[2]
  const session_number = parseInt(parts[3], 10)
  if (!session_id || isNaN(session_number)) return null
  return { session_id, session_number }
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
  tipo: 'afiliado' | 'oficial' | 'busca'
  price: number | null
  nivel: string | null
  utmSource: string | null
  utmMedium: string | null
  referrer: string | null
  hasSession: boolean
}) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  // Only flag as suspicious if referrer is /ir/ itself (redirect loop)
  const isSuspicious = opts.referrer?.includes('/ir/') ?? false
  const emoji  = isSuspicious ? '🤖' : (opts.tipo === 'afiliado' ? '💰' : opts.tipo === 'busca' ? '🔍' : '🔗')
  const preco  = opts.price
    ? `R$${opts.price.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
    : 'sem preço'
  const nivelMap: Record<string, string> = { iniciante: 'iniciante', intermediario: 'intermediário', avancado: 'avançado' }
  const nivel  = opts.nivel ? (nivelMap[opts.nivel] ?? opts.nivel) : '—'
  const tipoLabel = opts.tipo === 'busca' ? 'busca ML (fallback)' : opts.tipo
  const origem = opts.hasSession ? 'conversa' : 'direto'

  let via = origem
  if (opts.utmSource) {
    via = opts.utmMedium ? `${opts.utmSource}/${opts.utmMedium}` : opts.utmSource
  } else if (opts.referrer) {
    via = opts.referrer
  }

  const label  = isSuspicious ? 'Clique suspeito (loop)' : 'Clique em Comprar'
  const text   = `${emoji} ${label}\n${opts.racketName}\n${tipoLabel} · ${preco} · ${nivel}\nvia ${via}`

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
  sessionInfo: { session_id: string; session_number: number } | null
  slug: string
  racketName: string
  tipo: 'afiliado' | 'oficial' | 'busca'
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
  if (opts.sessionInfo) {
    eventParams.session_id     = opts.sessionInfo.session_id
    eventParams.session_number = opts.sessionInfo.session_number
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

  // Priority:
  // a. affiliate_url + is_active !== false → afiliado ML
  // b. affiliate_url + is_active === false → busca ML (fallback search)
  // c. no affiliate_url + SEARCH_FALLBACK_UNCOVERED → busca ML
  // d. source_url → oficial
  // e. nothing → 404
  let ctaUrl: string
  let tipo: 'afiliado' | 'oficial' | 'busca'
  let destination_type: string

  if (racket.affiliate_url && racket.is_active !== false) {
    ctaUrl = racket.affiliate_url
    tipo = 'afiliado'
    destination_type = 'ml'
  } else if (racket.affiliate_url && racket.is_active === false) {
    ctaUrl = buildMlSearchUrl(racket)
    tipo = 'busca'
    destination_type = 'ml'
  } else if (!racket.affiliate_url && SEARCH_FALLBACK_UNCOVERED) {
    ctaUrl = buildMlSearchUrl(racket)
    tipo = 'busca'
    destination_type = 'ml'
  } else if (racket.source_url) {
    ctaUrl = racket.source_url
    tipo = 'oficial'
    destination_type = ctaUrl.includes('mercadolivre.com.br') ? 'ml' : 'oficial'
  } else {
    notFound()
    return
  }

  const clientId   = gaClientId(cookieStore.get('_ga')?.value)
  // Derive _ga_STREAM_ID cookie name from measurement ID (e.g. G-ABC123 → _ga_ABC123)
  const streamCookieName = process.env.NEXT_PUBLIC_GA_ID?.replace(/^G-/, '_ga_') ?? null
  const sessionInfo = gaSessionInfo(streamCookieName ? cookieStore.get(streamCookieName)?.value : undefined)

  const price = racket.price ? Number(racket.price) : null

  const rawIp = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
             ?? hdrs.get('x-real-ip')
             ?? null
  const ipHash = rawIp && process.env.IP_HASH_SALT
    ? Array.from(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawIp + process.env.IP_HASH_SALT))
        )
      ).map(b => b.toString(16).padStart(2, '0')).join('')
    : null
  const pais = hdrs.get('x-vercel-ip-country') ?? null

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
        ip_hash:    ipHash,
        pais,
      }),
    !isTest && !!cookieStore.get('_ga')?.value
      ? sendGa4ClickEvent({
          clientId,
          sessionInfo,
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
          utmSource:  sessionOrigin?.utm_source ?? null,
          utmMedium:  sessionOrigin?.utm_medium ?? null,
          referrer:   sessionOrigin?.referrer ?? hdrs.get('referer') ?? null,
          hasSession: !!sessionId,
        })
      : Promise.resolve(),
  ])

  redirect(ctaUrl)
}
