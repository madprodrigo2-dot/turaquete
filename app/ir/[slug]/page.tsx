import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getRaquetaPorSlug } from '@/lib/recommend'
import { getSupabaseAdmin } from '@/lib/supabase'
import { headers } from 'next/headers'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

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

  try {
    await getSupabaseAdmin()
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
      })
  } catch {
    // non-blocking — click tracking must not break navigation
  }

  redirect(ctaUrl)
}
