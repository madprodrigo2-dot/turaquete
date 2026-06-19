'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { togglePublicada } from './actions'

export type RacketData = {
  id: number
  name: string
  slug: string
  publicada: boolean
  price: number | null
  affiliate_url: string | null
  source_url: string | null
  core: string | null
  model_year: number | null
  brandName: string
  ins: {
    power: number | null
    control: number | null
    comfort: number | null
    spin: number | null
    forgiveness: number | null
    maneuverability: number | null
    stability: number | null
    nivel_sugerido: string | null
    scoreGeral: number | null
  } | null
}

type SortCol = 'name' | 'brand' | 'year' | 'nivel' | 'scoreGeral' | 'price'
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

function HealthBadge({ price, source_url, affiliate_url, core }: {
  price: number | null
  source_url: string | null
  affiliate_url: string | null
  core: string | null
}) {
  const missing: string[] = []
  if (price == null) missing.push('preço')
  if (affiliate_url == null && source_url == null) missing.push('link')
  if (core == null) missing.push('core')

  if (missing.length === 0) {
    return <span className="inline-block w-2 h-2 rounded-full bg-teal-400" title="Dados completos" />
  }
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-600 border border-orange-200 cursor-help"
      title={`Falta: ${missing.join(', ')}`}
    >
      {missing.length}
    </span>
  )
}

function PublicadaToggle({ racket }: { racket: RacketData & { publicadaLocal: boolean } }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handle() {
    startTransition(async () => {
      await togglePublicada(racket.id, !racket.publicadaLocal)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      title={racket.publicadaLocal ? 'Clique para despublicar' : 'Clique para publicar'}
      className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border transition-colors disabled:opacity-40 ${
        racket.publicadaLocal
          ? 'border-teal-200 bg-teal-50 text-teal-600 hover:bg-red-50 hover:border-red-200 hover:text-red-500'
          : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-600'
      }`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${racket.publicadaLocal ? 'bg-teal-500' : 'bg-gray-300'}`} />
      {pending ? '…' : racket.publicadaLocal ? 'pub' : 'não'}
    </button>
  )
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
  const [filterAno, setFilterAno] = useState('')
  const [filterNivel, setFilterNivel] = useState('')
  const [filterAfiliado, setFilterAfiliado] = useState('')
  const [filterPublicada, setFilterPublicada] = useState('')
  const [filterIncompleta, setFilterIncompleta] = useState('')
  const [pubOverrides] = useState<Record<number, boolean>>({})

  const uniqueYears = useMemo(() => {
    const years = rackets.map(r => r.model_year).filter((y): y is number => y != null)
    return [...new Set(years)].sort((a, b) => b - a)
  }, [rackets])

  const hasFilters = !!(search || filterMarca || filterAno || filterNivel || filterAfiliado || filterPublicada || filterIncompleta)

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  function clearFilters() {
    setSearch(''); setFilterMarca(''); setFilterAno('')
    setFilterNivel(''); setFilterAfiliado(''); setFilterPublicada('')
    setFilterIncompleta('')
  }

  const racketRows = useMemo(() =>
    rackets.map(r => ({ ...r, publicadaLocal: pubOverrides[r.id] ?? r.publicada })),
  [rackets, pubOverrides])

  const filtered = useMemo(() => {
    let result = racketRows

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(r => r.name.toLowerCase().includes(q))
    }
    if (filterMarca) result = result.filter(r => r.brandName === filterMarca)
    if (filterAno)   result = result.filter(r => r.model_year === Number(filterAno))
    if (filterNivel) result = result.filter(r => r.ins?.nivel_sugerido === filterNivel)
    if (filterAfiliado === 'com') result = result.filter(r => r.affiliate_url != null)
    if (filterAfiliado === 'sem') result = result.filter(r => r.affiliate_url == null)
    if (filterPublicada === 'publicada') result = result.filter(r => r.publicadaLocal)
    if (filterPublicada === 'nao')       result = result.filter(r => !r.publicadaLocal)
    if (filterIncompleta === 'incompleta') result = result.filter(r =>
      r.price == null || (r.affiliate_url == null && r.source_url == null) || r.core == null
    )

    return [...result].sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0
      switch (sortCol) {
        case 'name':       av = a.name;                                  bv = b.name; break
        case 'brand':      av = a.brandName;                             bv = b.brandName; break
        case 'year':       av = a.model_year ?? 0;                       bv = b.model_year ?? 0; break
        case 'nivel':      av = nivOrder(a.ins?.nivel_sugerido ?? null); bv = nivOrder(b.ins?.nivel_sugerido ?? null); break
        case 'scoreGeral': av = a.ins?.scoreGeral ?? -1;                 bv = b.ins?.scoreGeral ?? -1; break
        case 'price':      av = a.price ?? -1;                           bv = b.price ?? -1; break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [racketRows, search, sortCol, sortDir, filterMarca, filterAno, filterNivel, filterAfiliado, filterPublicada, filterIncompleta])

  const selectCls = 'text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-600'

  function thCls(col: SortCol, align: 'left' | 'center' | 'right' = 'left') {
    const base = `py-2.5 cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap text-${align}`
    const pad = align === 'left' ? 'px-3 first:px-4' : align === 'right' ? 'px-4' : 'px-2'
    const active = sortCol === col ? 'text-teal-600' : 'text-gray-400'
    return `${base} ${pad} ${active}`
  }

  const colCount = 9

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

        <select value={filterAno} onChange={e => setFilterAno(e.target.value)} className={selectCls}>
          <option value="">Todos os anos</option>
          {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
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

        <select value={filterIncompleta} onChange={e => setFilterIncompleta(e.target.value)} className={selectCls}>
          <option value="">Dados: todos</option>
          <option value="incompleta">Só incompletas</option>
        </select>

        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors">
            Limpar ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 font-medium">
              <th className={thCls('name')} onClick={() => handleSort('name')}>
                Raqueta <SortIcon col="name" active={sortCol} dir={sortDir} />
              </th>
              <th className={thCls('brand')} onClick={() => handleSort('brand')}>
                Marca <SortIcon col="brand" active={sortCol} dir={sortDir} />
              </th>
              <th className={thCls('year', 'center')} onClick={() => handleSort('year')}>
                Ano <SortIcon col="year" active={sortCol} dir={sortDir} />
              </th>
              <th className={thCls('nivel')} onClick={() => handleSort('nivel')}>
                Nível <SortIcon col="nivel" active={sortCol} dir={sortDir} />
              </th>
              <th className={thCls('scoreGeral', 'center')} onClick={() => handleSort('scoreGeral')}>
                Geral <SortIcon col="scoreGeral" active={sortCol} dir={sortDir} />
              </th>
              <th className="px-2 py-2.5 text-gray-400 font-medium text-center whitespace-nowrap">Dados</th>
              <th className={thCls('price', 'right')} onClick={() => handleSort('price')}>
                Preço <SortIcon col="price" active={sortCol} dir={sortDir} />
              </th>
              <th className="px-3 py-2.5 text-gray-400 font-medium text-center whitespace-nowrap">Pub.</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma raqueta encontrada
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2 text-gray-800 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-gray-400">{r.brandName}</td>
                  <td className="px-2 py-2 text-center text-gray-400">{r.model_year ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-400">{nivLabel(r.ins?.nivel_sugerido ?? null)}</td>
                  <td className="px-2 py-2 text-center">
                    {r.ins?.scoreGeral != null
                      ? <span className="font-mono font-bold text-teal-700">{r.ins.scoreGeral}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-2 py-2 text-center">
                    <HealthBadge
                      price={r.price}
                      source_url={r.source_url}
                      affiliate_url={r.affiliate_url}
                      core={r.core}
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-gray-400">
                    {r.price ? `R$ ${r.price.toLocaleString('pt-BR')}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <PublicadaToggle racket={r} />
                  </td>
                  <td className="px-3 py-2 text-right">
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
        <span>Geral = média de 6 scores (sem spin)</span>
        <span>· Dados: dot verde = completa · badge laranja = campos faltando (hover para ver)</span>
        <span>· Clique em <strong>pub/nao</strong> para publicar ou despublicar</span>
      </p>
    </div>
  )
}
