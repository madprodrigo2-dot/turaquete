import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getSupabase } from '@/lib/supabase'
import AfiliadoRow from './AfiliadoRow'
import AfiliadoFilters from './AfiliadoFilters'

export const dynamic = 'force-dynamic'

interface RacketRow {
  id: number
  name: string
  price: number | null
  currency: string
  publicada: boolean
  affiliate_url: string | null
  brand_id: number | null
}

interface BrandRow {
  id: number
  name: string
  slug: string
}

export default async function AfiliadosPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; brand?: string }>
}) {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login')
  }

  const { filter, brand } = await searchParams
  const sb = getSupabase()

  const [{ data: rackets }, { data: brandsData }] = await Promise.all([
    sb
      .from('rackets')
      .select('id, name, price, currency, publicada, affiliate_url, brand_id')
      .order('name'),
    sb
      .from('brands')
      .select('id, name, slug')
      .order('name'),
  ])

  const rows = (rackets as RacketRow[] | null) ?? []
  const brands = (brandsData as BrandRow[] | null) ?? []
  const brandById = new Map(brands.map(b => [b.id, b]))

  const brandOptions = brands
    .filter(b => rows.some(r => r.brand_id === b.id))
    .map(b => ({ slug: b.slug, name: b.name }))

  // Apply filters
  let filtered = rows
  if (brand) {
    const matchId = brands.find(b => b.slug === brand)?.id
    if (matchId) filtered = filtered.filter(r => r.brand_id === matchId)
  }
  if (filter === 'sem_afiliado') {
    filtered = filtered.filter(r => !r.affiliate_url)
  }

  const total = rows.length
  const comLink = rows.filter(r => !!r.affiliate_url).length
  const semLink = total - comLink
  const pct = total > 0 ? Math.round((comLink / total) * 100) : 0

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Links de afiliado</h1>
        <p className="text-gray-400 text-xs mt-0.5">
          Cole ou edite o link de afiliado de cada raquete · clique Salvar para atualizar
        </p>
      </div>

      {/* Counter + progress */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-6">
        <div className="flex-1">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-sm font-semibold text-gray-800">
              {comLink} <span className="text-gray-400 font-normal">de</span> {total} com link
            </span>
            <span className={`text-xs font-medium ${semLink > 0 ? 'text-amber-500' : 'text-green-600'}`}>
              {semLink > 0 ? `${semLink} sem link` : 'Completo ✓'}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-teal-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1">{pct}% do catálogo</div>
        </div>
      </div>

      {/* Filters */}
      <AfiliadoFilters
        brands={brandOptions}
        currentFilter={filter}
        currentBrand={brand}
      />

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr className="text-[11px] text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-2.5 font-semibold">Raquete</th>
              <th className="text-left px-4 py-2.5 font-semibold">Preço</th>
              <th className="text-left px-4 py-2.5 font-semibold">Status</th>
              <th className="text-center px-4 py-2.5 font-semibold">Link</th>
              <th className="text-left px-4 py-2.5 font-semibold">URL de afiliado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <AfiliadoRow
                key={r.id}
                id={r.id}
                name={r.name}
                brandName={brandById.get(r.brand_id ?? -1)?.name ?? '—'}
                price={r.price}
                publicada={r.publicada}
                affiliateUrl={r.affiliate_url}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic text-sm">
                  {filter === 'sem_afiliado'
                    ? 'Todas as raquetes já têm link de afiliado. ✓'
                    : 'Nenhuma raquete encontrada.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 text-[11px] text-gray-400">
          {filtered.length} raquete{filtered.length !== 1 ? 's' : ''}
          {(filter || brand) ? ' (filtradas)' : ''}
        </div>
      </div>

    </div>
  )
}
