'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  brands: { slug: string; name: string }[]
  currentFilter?: string
  currentBrand?: string
  currentQ?: string
  semTag?: number
  inativos?: number
}

function Filters({ brands, currentFilter, currentBrand, currentQ, semTag, inativos }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [search, setSearch] = useState(currentQ ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearch(currentQ ?? '')
  }, [currentQ])

  function update(key: string, value: string | null) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`?${p.toString()}`, { scroll: false })
  }

  function handleSearch(val: string) {
    setSearch(val)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      const p = new URLSearchParams(params.toString())
      if (val.trim()) p.set('q', val.trim())
      else p.delete('q')
      router.replace(`?${p.toString()}`, { scroll: false })
    }, 250)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar raquete..."
          className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
        />
        {search && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          >
            ×
          </button>
        )}
      </div>

      {/* Filter chips */}
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
          onClick={() => update('filter', currentFilter === 'com_afiliado' ? null : 'com_afiliado')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            currentFilter === 'com_afiliado'
              ? 'bg-teal-600 text-white'
              : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
          }`}
        >
          ✓ Com afiliado
        </button>
        {(inativos ?? 0) > 0 && (
          <button
            onClick={() => update('filter', currentFilter === 'inativos' ? null : 'inativos')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              currentFilter === 'inativos'
                ? 'bg-red-500 text-white'
                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
            }`}
          >
            🔴 Anúncios inativos ({inativos})
          </button>
        )}
        {(semTag ?? 0) > 0 && (
          <button
            onClick={() => update('filter', currentFilter === 'sem_tag' ? null : 'sem_tag')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              currentFilter === 'sem_tag'
                ? 'bg-orange-500 text-white'
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            ⚠ ML sem tag ({semTag})
          </button>
        )}
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

        {(currentFilter || currentBrand || currentQ) && (
          <button
            onClick={() => { setSearch(''); router.push('?', { scroll: false }) }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-1"
          >
            × Limpar filtros
          </button>
        )}
      </div>
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
