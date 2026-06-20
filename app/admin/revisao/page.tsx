import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { classifyFace, classifyCore } from '@/lib/motor'
import RevisaoClient, { type RevisaoCard } from './RevisaoClient'

type RawRacket = {
  id: number
  name: string
  slug: string
  model_year: number | null
  image_url: string | null
  publicada: boolean
  price: number | null
  source_url: string | null
  affiliate_url: string | null
  face_material: string | null
  core: string | null
  weight_g: number | null
  balance: string | null
  specs_extra: Record<string, unknown> | null
  destaque_atleta: string | null
  brands: { name: string } | null
  racket_insights:
    | RawInsights
    | RawInsights[]
    | null
}

type RawInsights = {
  power: number | null
  control: number | null
  comfort: number | null
  maneuverability: number | null
  stability: number | null
  spin: number | null
  forgiveness: number | null
  nivel_sugerido: string | null
  perfil_resumo: string | null
  review_status: string | null
  review_note: string | null
  reviewed_at: string | null
}

const SCORE_DIMS = ['power', 'control', 'maneuverability', 'stability', 'forgiveness'] as const

export default async function RevisaoPage() {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const sb = getSupabase()

  const { data, error } = await sb
    .from('rackets')
    .select(`
      id, name, slug, model_year, image_url, publicada, price,
      source_url, affiliate_url, face_material, core, weight_g,
      balance, specs_extra, destaque_atleta,
      brands(name),
      racket_insights(
        power, control, comfort, maneuverability, stability, spin,
        forgiveness, nivel_sugerido, perfil_resumo,
        review_status, review_note, reviewed_at
      )
    `)
    .order('name')

  if (error) console.error('[admin/revisao] query error:', error.message)

  const cards: RevisaoCard[] = ((data ?? []) as unknown as RawRacket[]).map(r => {
    const ins = Array.isArray(r.racket_insights)
      ? (r.racket_insights[0] ?? null)
      : r.racket_insights

    const extra = (r.specs_extra ?? {}) as Record<string, unknown>
    const tecnologias = Array.isArray(extra.tecnologias)
      ? (extra.tecnologias as { nome: string; tipo: string }[])
      : []
    const atletas: string[] = Array.isArray(extra.atleta)
      ? (extra.atleta as string[]).filter(Boolean)
      : typeof extra.atleta === 'string' && extra.atleta
        ? [extra.atleta]
        : []
    const atleta = atletas[0] ?? null

    const scoreVals = SCORE_DIMS.map(k => ins?.[k]).filter((v): v is number => v != null)
    const scoreGeral = scoreVals.length > 0
      ? Math.round((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) * 10) / 10
      : null

    const reviewStatus = (ins?.review_status ?? 'pendente') as 'pendente' | 'ok' | 'flagged'

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      brand: r.brands?.name ?? '—',
      model_year: r.model_year,
      image_url: r.image_url,
      publicada: r.publicada,
      price: r.price,
      source_url: r.source_url,
      affiliate_url: r.affiliate_url,
      face_material: r.face_material,
      faceGrade: classifyFace(r.face_material),
      core: r.core,
      coreClass: classifyCore(r.core),
      weight_g: r.weight_g,
      balance: r.balance,
      espessura_mm: typeof extra.espessura_mm === 'number' ? extra.espessura_mm : null,
      furos: typeof extra.furos === 'number' ? extra.furos : null,
      superficie: typeof extra.superficie === 'string' ? extra.superficie : null,
      tecnologias,
      atleta,
      atletas,
      perfil_resumo: ins?.perfil_resumo ?? null,
      power: ins?.power ?? null,
      control: ins?.control ?? null,
      comfort: ins?.comfort ?? null,
      maneuverability: ins?.maneuverability ?? null,
      stability: ins?.stability ?? null,
      spin: ins?.spin ?? null,
      forgiveness: ins?.forgiveness ?? null,
      scoreGeral,
      nivel: ins?.nivel_sugerido ?? null,
      review_status: reviewStatus,
      review_note: ins?.review_note ?? null,
    }
  })

  const brands = [...new Set(cards.map(c => c.brand))].sort()

  return <RevisaoClient cards={cards} brands={brands} />
}
