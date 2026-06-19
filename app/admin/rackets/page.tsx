import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import RaquetasTable from './RaquetasTable'

const SCORE_FIELDS = ['power', 'control', 'comfort', 'forgiveness', 'maneuverability', 'stability'] as const
type InsRow = { [K in typeof SCORE_FIELDS[number]]: number | null } & { spin: number | null; nivel_sugerido: string | null }

type RacketRow = {
  id: number
  name: string
  slug: string
  publicada: boolean
  price: number | null
  affiliate_url: string | null
  brand_id: number | null
  model_year: number | null
  racket_insights: InsRow | InsRow[] | null
}

export default async function AdminRaquetasPage() {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const sb = getSupabase()

  const [{ data, error }, { data: brandsData }] = await Promise.all([
    sb
      .from('rackets')
      .select('id, name, slug, publicada, price, affiliate_url, brand_id, model_year, racket_insights(power, control, comfort, spin, forgiveness, maneuverability, stability, nivel_sugerido)')
      .order('name'),
    sb.from('brands').select('id, name').order('name'),
  ])

  if (error) console.error('[admin/rackets] query error:', error.message)

  const brandMap = new Map((brandsData ?? []).map((b: { id: number; name: string }) => [b.id, b.name]))

  const rackets = ((data ?? []) as RacketRow[]).map(r => {
    const ins = Array.isArray(r.racket_insights) ? (r.racket_insights[0] ?? null) : r.racket_insights
    const scoreVals = ins ? SCORE_FIELDS.map(k => ins[k]).filter((v): v is number => v != null) : []
    const scoreGeral = scoreVals.length > 0
      ? Math.round((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) * 10) / 10
      : null
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      publicada: r.publicada,
      price: r.price,
      affiliate_url: r.affiliate_url,
      model_year: r.model_year,
      brandName: r.brand_id ? (brandMap.get(r.brand_id) ?? '—') : '—',
      ins: ins ? { ...ins, scoreGeral } : null,
    }
  })

  return (
    <RaquetasTable
      rackets={rackets}
      brands={(brandsData ?? []) as { id: number; name: string }[]}
      total={rackets.length}
    />
  )
}
