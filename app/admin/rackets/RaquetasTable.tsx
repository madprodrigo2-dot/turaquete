'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

export type RacketData = {
  id: number
  name: string
  slug: string
  publicada: boolean
  price: number | null
  affiliate_url: string | null
  brandName: string
  ins: {
    power: number | null
    control: number | null
    comfort: number | null
    spin: number | null
    nivel_sugerido: string | null
  } | null
}

type SortCol = 'name' | 'brand' | 'nivel' | 'power' | 'comfort' | 'control' | 'spin' | 'price'
type SortDir = 'asc' | 'desc'

function nivLabel(n: string | null) {
  if (n === 'iniciante') return 'ini'
  if (n === 'intermediario') return 'int'
  if (n === 'avancado') return 'avç'
  return '—'
}

function nivOrder(n: string | null) {
  if (n === 'iniciante') return 1
  if (n === 'intermediario') return 2
  if (n === 'avancado') return 3
  return 0
}

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (active !== col) return <span className="ml-0.5 text-gray-300">↕</span>
  return <span className="ml-0.5 text-teal-500">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function RaquetasTable({
  rackets,
  brands,
  total,
}: {
  rackets: RacketData[]
  brands: { id: number; name: string }[]
  total: number
}) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filterMarca, setFilterMarca] = useState('')
  const [filterNivel, setFilterNivel] = useState('')
  const [filterAfiliado, setFilterAfiliado] = useState('')
  const [filterPublicada, setFilterPublicada] = useState('')

  const hasFilters = !!(search || filterMarca || filterNivel || filterAfiliado || filterPublicada)

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  function clearFilters() {
    setSearch('')
    setFilterMarca('')
    setFilterNivel('')
    setFilterAfiliado('')
    setFilterPublicada('')
  }

  const filtered = useMemo(() => {
    let result = rackets

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(r => r.name.toLowerCase().includes(q))
    }
    if (filterMarca) result = result.filter(r => r.brandName === filterMarca)
    if (filterNivel) result = result.filter(r => r.ins?.nivel_sugerido === filterNivel)
    if (filterAfiliado === 'com') result = result.filter(r => r.affiliate_url != null)
    if (filterAfiliado === 'sem') result = result.filter(r => r.affiliate_url == null)
    if (filterPublicada === 'publicada') result = result.filter(r => r.publicada)
    if (filterPublicada === 'nao') result = result.filter(r => !r.publicada)

    return [...result].sort((a, b) => {
      let av: string | number = 0
      let bv: string | number = 0
      switch (sortCol) {
        case 'name':    av = a.name;                              bv = b.name; break
        case 'brand':   av = a.brandName;                         bv = b.brandName; break
        case 'nivel':   av = nivOrder(a.ins?.nivel_sugerido ?? null); bv = nivOrder(b.ins?.nivel_sugerido ?? null); break
        case 'power':   av = a.ins?.power   ?? -1;               bv = b.ins?.power   ?? -1; break
        case 'comfort': av = a.ins?.comfort ?? -1;               bv = b.ins?.comfort ?? -1; break
        case 'control': av = a.ins?.control ?? -1;               bv = b.ins?.control ?? -1; break
        case 'spin':    av = a.ins?.spin    ?? -1;               bv = b.ins?.spin    ?? -1; break
        case 'price':   av = a.price        ?? -1;               bv = b.price        ?? -1; break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rackets, search, sortCol, sortDir, filterMarca, filterNivel, filterAfiliado, filterPublicada])

  const selectCls = 'text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-600'

  function thCls(col: SortCol, align: 'left' | 'center' | 'right' = 'left') {
    const base = `py-2.5 cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap text-${align}`
    const pad = align === 'left' ? 'px-3 first:px-4' : align === 'right' ? 'px-4' : 'px-2'
    const active = sortCol === col ? 'text-teal-600' : 'text-gray-400'
    return `${base} ${pad} ${active}`
  }

  return (
    <div>
      {/* Title + search */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-sm font-semibold text-gray-800">
          Raquetas{' '}
          <span className="text-gray-400 font-normal">
            ({filtered.length}{hasFilters && filtered.length !== total ? ` de ${total}` : ''})
          </span>
        </h1>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-40 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterMarca} onChange={e => setFilterMarca(e.target.value)} className={selectCls}>
          <option value="">Todas as marcas</option>
          {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>

        <select value={filterNivel} onChange={e => setFilterNivel(e.target.value)} className={selectCls}>
          <option value="">Todos os níveis</option>
          <option value="iniciante">Iniciante</option>
          <option value="intermediario">Intermediário</option>
          <option value="avancado">Avançado</option>
        </select>

        <select value={filterAfiliado} onChange={e => setFilterAfiliado(e.target.value)} className={selectCls}>
          <option value="">Afiliado: todos</option>
          <option value="com">Com link</option>
          <option value="sem">Sem link</option>
        </select>

        <select value={filterPublicada} onChange={e => setFilterPublicada(e.target.value)} className={selectCls}>
          <option value="">Publicação: todas</option>
          <option value="publicada">Publicadas</option>
          <option value="nao">Não publicadas</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors"
          >
            Limpar ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 font-medium">
              <th className={thCls('name')} onClick={() => handleSort('name')}>
                Raqueta <SortIcon col="name" active={sortCol} dir={sortDir} />
              </th>
              <th className={thCls('brand')} onClick={() => handleSort('brand')}>
                Marca <SortIcon col="brand" active={sortCol} dir={sortDir} />
              </th>
              <th className={thCls('nivel')} onClick={() => handleSort('nivel')}>
                Nível <SortIcon col="nivel" active={sortCol} dir={sortDir} />
              </th>
              <th className={thCls('power', 'center')} onClick={() => handleSort('power')}>
                Pot <SortIcon col="power" active={sortCol} dir={sortDir} />
              </th>
              <th className={thCls('comfort', 'center')} onClick={() => handleSort('comfort')}>
                Conf <SortIcon col="comfort" active={sortCol} dir={sortDir} />
              </th>
              <th className={thCls('control', 'center')} onClick={() => handleSort('control')}>
                Ctrl <SortIcon col="control" active={sortCol} dir={sortDir} />
              </th>
              <th className={thCls('spin', 'center')} onClick={() => handleSort('spin')}>
                Spin <SortIcon col="spin" active={sortCol} dir={sortDir} />
              </th>
              <th className={thCls('price', 'right')} onClick={() => handleSort('price')}>
                Preço <SortIcon col="price" active={sortCol} dir={sortDir} />
              </th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma raqueta encontrada
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${r.publicada ? 'bg-teal-500' : 'bg-gray-300'}`} />
                    <span className="text-gray-800 font-medium">{r.name}</span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-400">{r.brandName}</td>
                  <td className="px-3 py-2.5 text-gray-400">{nivLabel(r.ins?.nivel_sugerido ?? null)}</td>
                  <td className="px-2 py-2.5 text-center text-gray-500">{r.ins?.power   ?? '—'}</td>
                  <td className="px-2 py-2.5 text-center text-gray-500">{r.ins?.comfort ?? '—'}</td>
                  <td className="px-2 py-2.5 text-center text-gray-500">{r.ins?.control ?? '—'}</td>
                  <td className="px-2 py-2.5 text-center text-gray-500">{r.ins?.spin    ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">
                    {r.price ? `R$ ${r.price.toLocaleString('pt-BR')}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link href={`/admin/rackets/${r.slug}`} className="text-teal-600 hover:text-teal-800 font-medium">
                      Editar →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400 flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />
          publicada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />
          não publicada
        </span>
        <span>· Pot=potência Conf=conforto Ctrl=controle</span>
      </p>
    </div>
  )
}
