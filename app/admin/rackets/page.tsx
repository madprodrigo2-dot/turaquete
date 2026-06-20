import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import RaquetasTable from './RaquetasTable'

const SCORE_FIELDS = ['power', 'control', 'maneuverability', 'stability'] as const
type InsRow = { [K in typeof SCORE_FIELDS[number]]: number | null } & { spin: number | null; comfort: number | null; forgiveness: number | null; nivel_sugerido: string | null }

type RacketRow = {
  id: number
  name: string
  slug: string
  publicada: boolean
  price: number | null
  affiliate_url: string | null
  source_url: string | null
  core: string | null
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
      .select('id, name, slug, publicada, price, affiliate_url, source_url, core, brand_id, model_year, racket_insights(power, control, comfort, spin, forgiveness, maneuverability, stability, nivel_sugerido)')
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
    const scoreIni = ins && ins.power != null && ins.control != null && ins.comfort != null && ins.maneuverability != null && ins.stability != null && ins.forgiveness != null
      ? Math.round((ins.power*5 + ins.control*15 + ins.comfort*25 + ins.maneuverability*20 + ins.stability*10 + ins.forgiveness*25) / 10) / 10
      : null
    const scoreInt = ins && ins.power != null && ins.control != null && ins.comfort != null && ins.maneuverability != null && ins.stability != null && ins.forgiveness != null
      ? Math.round((ins.power*12 + ins.control*22 + ins.comfort*15 + ins.maneuverability*15 + (ins.spin ?? 5)*3 + ins.stability*22 + ins.forgiveness*11) / 10) / 10
      : null
    const scoreAva = ins && ins.power != null && ins.control != null && ins.comfort != null && ins.maneuverability != null && ins.stability != null && ins.forgiveness != null
      ? Math.round((ins.power*18 + ins.control*20 + ins.comfort*12 + ins.maneuverability*12 + (ins.spin ?? 5)*7 + ins.stability*20 + ins.forgiveness*11) / 10) / 10
      : null
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      publicada: r.publicada,
      price: r.price,
      affiliate_url: r.affiliate_url,
      source_url: r.source_url,
      core: r.core,
      model_year: r.model_year,
      brandName: r.brand_id ? (brandMap.get(r.brand_id) ?? '—') : '—',
      ins: ins ? { ...ins, scoreGeral, scoreIni, scoreInt, scoreAva } : null,
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
