'use client'

import { useState, useMemo } from 'react'
import AfiliadoRow from './AfiliadoRow'
import { buildMlSearchUrl } from '@/lib/ml-search'

export interface RowData {
  id: number
  name: string
  brandName: string
  price: number | null
  publicada: boolean
  is_active: boolean | null
  affiliate_url: string | null
  source_url: string | null
  price_updated_at: string | null
  fallbackUrl: string | null
  model_year: number | null
}

type FilterKey = 'all' | 'afiliado' | 'inativos' | 'sem_preco' | 'sem_tag' | 'source' | 'sem_link'
type SortCol   = 'name' | 'price' | 'tipo' | 'status' | 'year'
type SortDir   = 'asc' | 'desc'

function getTipo(r: RowData): FilterKey {
  if (r.is_active === false && r.affiliate_url)                    return 'inativos'
  if (r.affiliate_url && !r.price_updated_at)                      return 'sem_preco'
  if (r.affiliate_url && !r.affiliate_url.includes('matt_word'))   return 'sem_tag'
  if (r.affiliate_url)                                             return 'afiliado'
  if (r.source_url)                                                return 'source'
  return 'sem_link'
}

const TIPO_ORDER: Record<FilterKey, number> = {
  inativos: 0, sem_preco: 1, sem_tag: 2, sem_link: 3, source: 4, afiliado: 5, all: 6,
}

const FILTER_LABELS_DEFAULT: Record<FilterKey, string> = {
  all:       'Todas',
  afiliado:  '💰 Afiliado',
  inativos:  '🔍 Inativos',
  sem_preco: '⏰ Sem preço',
  sem_tag:   '⚠ Sem tag',
  source:    '🔗 Só source',
  sem_link:  '❌ Sem link',
}
const FILTER_LABELS_FALLBACK: Record<FilterKey, string> = {
  ...FILTER_LABELS_DEFAULT,
  source: '🔍 Busca ML (fallback)',
}

const FILTER_STYLES: Record<FilterKey, { active: string; inactive: string }> = {
  all:       { active: 'bg-teal-600 text-white',    inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
  afiliado:  { active: 'bg-teal-600 text-white',    inactive: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200' },
  inativos:  { active: 'bg-amber-500 text-white',   inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' },
  sem_preco: { active: 'bg-orange-500 text-white',  inactive: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200' },
  sem_tag:   { active: 'bg-orange-500 text-white',  inactive: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200' },
  source:    { active: 'bg-gray-500 text-white',    inactive: 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200' },
  sem_link:  { active: 'bg-red-500 text-white',     inactive: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' },
}

function SortIcon({ col, current, dir }: { col: SortCol; current: SortCol; dir: SortDir }) {
  if (col !== current) return <span className="text-gray-300 ml-1">↕</span>
  return <span className="text-teal-600 ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function AfiliadoTable({ rows, brands, searchFallbackActive = false }: { rows: RowData[]; brands: { slug: string; name: string }[]; searchFallbackActive?: boolean }) {
  const [q, setQ]             = useState('')
  const [filter, setFilter]   = useState<FilterKey>('all')
  const [brand, setBrand]     = useState('')
  const [sort, setSort]       = useState<{ col: SortCol; dir: SortDir }>({ col: 'name', dir: 'asc' })

  // Counts per tipo (before brand/q filter, for chips)
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: rows.length, afiliado: 0, inativos: 0, sem_preco: 0, sem_tag: 0, source: 0, sem_link: 0 }
    for (const r of rows) c[getTipo(r)]++
    return c
  }, [rows])

  // Filtered + sorted rows
  const displayed = useMemo(() => {
    let out = rows

    if (brand) out = out.filter(r => r.brandName === brand)
    if (q)     out = out.filter(r => r.name.toLowerCase().includes(q.toLowerCase()) || r.brandName.toLowerCase().includes(q.toLowerCase()))
    if (filter !== 'all') out = out.filter(r => getTipo(r) === filter)

    out = [...out].sort((a, b) => {
      let cmp = 0
      if (sort.col === 'name')   cmp = a.name.localeCompare(b.name, 'pt-BR')
      if (sort.col === 'price')  cmp = (a.price ?? -1) - (b.price ?? -1)
      if (sort.col === 'status') cmp = Number(b.publicada) - Number(a.publicada)
      if (sort.col === 'tipo')   cmp = TIPO_ORDER[getTipo(a)] - TIPO_ORDER[getTipo(b)]
      if (sort.col === 'year')   cmp = (a.model_year ?? 0) - (b.model_year ?? 0)
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return out
  }, [rows, q, filter, brand, sort])

  function toggleSort(col: SortCol) {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  }

  const hasFilters = filter !== 'all' || brand || q

  return (
    <div className="flex flex-col gap-4">

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none select-none">🔍</span>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nome ou marca..."
          className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">×</button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'afiliado', 'inativos', 'sem_preco', 'sem_tag', 'source', 'sem_link'] as FilterKey[]).map(f => {
          const count = counts[f]
          if (f !== 'all' && f !== 'afiliado' && count === 0) return null
          const styles = FILTER_STYLES[f]
          const labels = searchFallbackActive ? FILTER_LABELS_FALLBACK : FILTER_LABELS_DEFAULT
          return (
            <button
              key={f}
              onClick={() => setFilter(f === filter ? 'all' : f)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === f ? styles.active : styles.inactive
              }`}
            >
              {labels[f]}{f !== 'all' ? ` (${count})` : ` (${count})`}
            </button>
          )
        })}

        <div className="ml-auto flex items-center gap-2">
          {brands.length > 1 && (
            <select
              value={brand}
              onChange={e => setBrand(e.target.value)}
              className="text-xs border border-gray-200 rounded-full px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-600"
            >
              <option value="">Todas as marcas</option>
              {brands.map(b => (
                <option key={b.slug} value={b.name}>{b.name}</option>
              ))}
            </select>
          )}
          {hasFilters && (
            <button
              onClick={() => { setQ(''); setFilter('all'); setBrand('') }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              × Limpar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr className="text-[11px] text-gray-500 uppercase tracking-wide">
              <th
                className="text-left px-4 py-2.5 font-semibold cursor-pointer hover:text-gray-800 select-none"
                onClick={() => toggleSort('name')}
              >
                Raquete <SortIcon col="name" current={sort.col} dir={sort.dir} />
              </th>
              <th
                className="text-left px-4 py-2.5 font-semibold cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
                onClick={() => toggleSort('year')}
              >
                Ano <SortIcon col="year" current={sort.col} dir={sort.dir} />
              </th>
              <th
                className="text-left px-4 py-2.5 font-semibold cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
                onClick={() => toggleSort('price')}
              >
                Preço <SortIcon col="price" current={sort.col} dir={sort.dir} />
              </th>
              <th
                className="text-left px-4 py-2.5 font-semibold cursor-pointer hover:text-gray-800 select-none"
                onClick={() => toggleSort('status')}
              >
                Status <SortIcon col="status" current={sort.col} dir={sort.dir} />
              </th>
              <th
                className="text-left px-4 py-2.5 font-semibold cursor-pointer hover:text-gray-800 select-none"
                onClick={() => toggleSort('tipo')}
              >
                Tipo <SortIcon col="tipo" current={sort.col} dir={sort.dir} />
              </th>
              <th className="text-left px-4 py-2.5 font-semibold">URL de afiliado</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(r => (
              <AfiliadoRow
                key={r.id}
                id={r.id}
                name={r.name}
                brandName={r.brandName}
                price={r.price}
                publicada={r.publicada}
                isActive={r.is_active}
                affiliateUrl={r.affiliate_url}
                sourceUrl={r.source_url}
                priceUpdatedAt={r.price_updated_at}
                fallbackUrl={r.fallbackUrl}
                modelYear={r.model_year}
                searchFallbackActive={searchFallbackActive}
              />
            ))}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic text-sm">
                  {q ? `Nenhuma raquete encontrada para "${q}".` : 'Nenhuma raquete com este filtro.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 text-[11px] text-gray-400">
          {displayed.length} de {rows.length} raquete{rows.length !== 1 ? 's' : ''}
          {hasFilters ? ' (filtradas)' : ''}
        </div>
      </div>
    </div>
  )
}
