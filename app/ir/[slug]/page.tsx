import { redirect, notFound } from 'next/navigation'
import { getRaquetaPorSlug } from '@/lib/recommend'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function IrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const racket = await getRaquetaPorSlug(slug)

  if (!racket) notFound()

  const ctaUrl = racket.affiliate_url ?? racket.source_url ?? null
  if (!ctaUrl) notFound()

  const tipo: 'afiliado' | 'oficial' = racket.affiliate_url ? 'afiliado' : 'oficial'

  try {
    await getSupabaseAdmin()
      .from('link_clicks')
      .insert({ racket_id: racket.id, tipo })
  } catch {
    // non-blocking — click tracking must not break navigation
  }

  redirect(ctaUrl)
}
