'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  brands: { slug: string; name: string }[]
  currentFilter?: string
  currentBrand?: string
}

function Filters({ brands, currentFilter, currentBrand }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  function update(key: string, value: string | null) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`?${p.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => update('filter', null)}
        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
          !currentFilter ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        Todas
      </button>
      <button
        onClick={() => update('filter', currentFilter === 'sem_afiliado' ? null : 'sem_afiliado')}
        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
          currentFilter === 'sem_afiliado'
            ? 'bg-amber-500 text-white'
            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
        }`}
      >
        ⚠ Sem afiliado
      </button>

      {brands.length > 1 && (
        <select
          value={currentBrand ?? ''}
          onChange={e => update('brand', e.target.value || null)}
          className="text-xs border border-gray-200 rounded-full px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-600"
        >
          <option value="">Todas as marcas</option>
          {brands.map(b => (
            <option key={b.slug} value={b.slug}>{b.name}</option>
          ))}
        </select>
      )}

      {(currentFilter || currentBrand) && (
        <button
          onClick={() => router.push('?', { scroll: false })}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-1"
        >
          × Limpar filtros
        </button>
      )}
    </div>
  )
}

export default function AfiliadoFilters(props: Props) {
  return (
    <Suspense fallback={null}>
      <Filters {...props} />
    </Suspense>
  )
}
