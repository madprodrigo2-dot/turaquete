import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import BlocoA from './BlocoA'
import BlocoB from './BlocoB'
import BlocoC from './BlocoC'

export type OverrideEntry = {
  value: number
  motivo: string
  por: string
  em: string
  motor_at_time?: number | null
}

export type AdminInsights = {
  power: number | null
  control: number | null
  comfort: number | null
  maneuverability: number | null
  stability: number | null
  spin: number | null
  forgiveness: number | null
  good_for_beginners: boolean
  good_for_intermediate: boolean
  good_for_advanced: boolean
  elbow_friendly: boolean
  shoulder_friendly: boolean
  observations: string[] | null
  summary: string | null
  perfil_resumo: string | null
  nivel_sugerido: 'iniciante' | 'intermediario' | 'avancado' | null
  confianca: string | null
  motor_cache: Record<string, number | null> | null
  overrides: Record<string, OverrideEntry> | null
  ai_drafted: boolean | null
  reviewed: boolean | null
}

export type AdminRacket = {
  id: number
  name: string
  slug: string
  model_year: number | null
  weight_g: number | null
  balance: string | null
  format: string | null
  face_material: string | null
  core: string | null
  price: number | null
  currency: string
  affiliate_url: string | null
  source_url: string | null
  image_url: string | null
  technologies: string[] | null
  specs_extra: Record<string, unknown> | null
  publicada: boolean
  is_active: boolean | null
  destaque_atleta: boolean | null
  brand: { id: number; name: string } | null
  racket_insights: AdminInsights | null
}

export default async function EditRaquetaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const { slug } = await params
  const sb = getSupabaseAdmin()

  const { data, error } = await sb
    .from('rackets')
    .select(`
      id, name, slug, model_year, weight_g, balance, format,
      face_material, core, price, currency,
      affiliate_url, source_url, image_url,
      technologies, specs_extra,
      publicada, is_active, destaque_atleta,
      brand:brands(id, name),
      racket_insights(
        power, control, comfort, maneuverability, stability, spin, forgiveness,
        good_for_beginners, good_for_intermediate, good_for_advanced,
        elbow_friendly, shoulder_friendly,
        observations, summary, perfil_resumo,
        nivel_sugerido, confianca,
        motor_cache, overrides,
        ai_drafted, reviewed
      )
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) notFound()

  const raw = data as Record<string, unknown>
  const racket: AdminRacket = {
    ...(raw as Omit<AdminRacket, 'racket_insights' | 'brand'>),
    racket_insights: Array.isArray(raw.racket_insights)
      ? ((raw.racket_insights[0] as AdminInsights) ?? null)
      : (raw.racket_insights as AdminInsights | null),
    brand: Array.isArray(raw.brand)
      ? ((raw.brand[0] as AdminRacket['brand']) ?? null)
      : (raw.brand as AdminRacket['brand']),
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/admin/rackets" className="hover:text-gray-600 transition-colors">
          Raquetas
        </Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{racket.name}</span>
        {!racket.publicada && (
          <span className="ml-2 bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full text-[10px] font-medium">
            não publicada
          </span>
        )}
      </div>

      <BlocoA slug={slug} racket={racket} />
      <BlocoB slug={slug} racket={racket} />
      <BlocoC slug={slug} racket={racket} />
    </div>
  )
}
