import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getSupabase } from '@/lib/supabase'
import { buildMlSearchUrl, SEARCH_FALLBACK_UNCOVERED } from '@/lib/ml-search'
import AfiliadoTable, { type RowData } from './AfiliadoTable'

export const dynamic = 'force-dynamic'

interface RacketRow {
  id: number
  name: string
  price: number | null
  currency: string
  publicada: boolean
  is_active: boolean | null
  affiliate_url: string | null
  source_url: string | null
  brand_id: number | null
  price_updated_at: string | null
}

interface BrandRow {
  id: number
  name: string
  slug: string
}

export default async function AfiliadosPage() {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login')
  }

  const sb = getSupabase()

  const [{ data: rackets }, { data: brandsData }] = await Promise.all([
    sb
      .from('rackets')
      .select('id, name, price, currency, publicada, is_active, affiliate_url, source_url, brand_id, price_updated_at')
      .order('name'),
    sb
      .from('brands')
      .select('id, name, slug')
      .order('name'),
  ])

  const rawRows  = (rackets as RacketRow[] | null) ?? []
  const brands   = (brandsData as BrandRow[] | null) ?? []
  const brandById = new Map(brands.map(b => [b.id, b]))

  const total       = rawRows.length
  const comAfiliado = rawRows.filter(r => !!r.affiliate_url).length
  const inativos    = rawRows.filter(r => r.is_active === false && !!r.affiliate_url).length
  const semLink     = rawRows.filter(r => !r.affiliate_url && !r.source_url).length
  const semPreco    = rawRows.filter(r => !!r.affiliate_url && r.is_active !== false && !r.price_updated_at).length
  const pct         = total > 0 ? Math.round((comAfiliado / total) * 100) : 0

  const rows: RowData[] = rawRows.map(r => {
    const brand = brandById.get(r.brand_id ?? -1)
    return {
      id:               r.id,
      name:             r.name,
      brandName:        brand?.name ?? '—',
      price:            r.price,
      publicada:        r.publicada,
      is_active:        r.is_active,
      affiliate_url:    r.affiliate_url,
      source_url:       r.source_url,
      price_updated_at: r.price_updated_at,
      fallbackUrl:      (r.is_active === false && r.affiliate_url) || (!r.affiliate_url && SEARCH_FALLBACK_UNCOVERED)
        ? buildMlSearchUrl({ name: r.name, brands: brand ? { name: brand.name } : null })
        : null,
    }
  })

  const brandOptions = brands
    .filter(b => rawRows.some(r => r.brand_id === b.id))
    .map(b => ({ slug: b.slug, name: b.name }))

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Links de afiliado</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            Cole ou edite o link de afiliado · clique Salvar para atualizar
          </p>
        </div>
        <div className="text-right text-xs text-gray-500 space-y-0.5 pt-1">
          <div className="font-semibold text-gray-800">{comAfiliado}/{total} com afiliado ({pct}%)</div>
          {inativos > 0  && <div className="text-amber-600">🔍 {inativos} em fallback busca ML</div>}
          {semPreco > 0  && <div className="text-orange-500">⏰ {semPreco} sem preço sincronizado</div>}
          {semLink > 0   && <div className="text-red-500">❌ {semLink} sem nenhum link</div>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
          <span>Cobertura afiliado ML</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-teal-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Table with filters + sort — all client-side */}
      <AfiliadoTable rows={rows} brands={brandOptions} searchFallbackActive={SEARCH_FALLBACK_UNCOVERED} />

    </div>
  )
}
