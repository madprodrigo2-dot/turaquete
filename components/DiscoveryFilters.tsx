'use client'

import Link from 'next/link'
import { useState, useMemo, useRef } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import type { RacketWithInsights } from '@/lib/recommend'
import { getDisplayName } from '@/lib/displayName'
import RacketImageTile from './RacketImageTile'
import { NIVEL_LABEL } from './SpecsGrid'
import { derivarNivel } from '@/lib/nivel'
import NaoAcheiWidget from './NaoAcheiWidget'
import { PRECO_BUCKETS } from '@/lib/agent/preco-buckets'

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export type SortKey = 'lancamentos' | 'menor-preco' | 'maior-preco'

const NIVEL_SHORT: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

// Specs duras — núcleo · espessura · material da face. Só o que já existe no
// banco, mesma lógica de app/marcas/[slug]/page.tsx (buildSpecLine).
function buildSpecLine(racket: RacketWithInsights): string | null {
  const parts: string[] = []
  if (racket.core) parts.push(racket.core)
  const esp = (racket.specs_extra as Record<string, unknown> | null)?.espessura_mm
  if (typeof esp === 'number') parts.push(`${esp}mm`)
  if (racket.face_material) parts.push(racket.face_material)
  return parts.length > 0 ? parts.join(' · ') : null
}

function RacketCard({ racket }: { racket: RacketWithInsights }) {
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null
  const _athleteRaw = (racket.specs_extra as Record<string, unknown> | null)?.atleta
  const athlete: string | undefined = Array.isArray(_athleteRaw)
    ? (_athleteRaw as string[]).filter(Boolean).join(' & ') || undefined
    : typeof _athleteRaw === 'string' ? _athleteRaw : undefined
  const nivel = derivarNivel(racket)
  const specLine = buildSpecLine(racket)

  return (
    <Link
      href={`/raquetes/${racket.slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-card border border-[rgba(14,58,64,0.06)] hover:-translate-y-1 hover:border-aqua/30 transition-all duration-200 flex flex-col"
    >
      <RacketImageTile src={racket.image_url} alt={racket.name} athlete={athlete} brandLogo={racket.brands?.logo_url} brandName={racket.brands?.name} hoverScale />
      <div className="p-3 flex flex-col gap-1 flex-1">
        {nivel && (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-tinta/[0.06] text-tinta/50 w-fit leading-none">
            {NIVEL_SHORT[nivel] ?? nivel}
          </span>
        )}
        <p className="text-tinta text-xs font-semibold leading-snug line-clamp-2 min-h-[33px]">{getDisplayName(racket)}</p>
        {price && <p className="text-coral font-bold text-sm">{price}</p>}
        {specLine && <p className="text-tinta/45 text-[10px] leading-snug">{specLine}</p>}
      </div>
    </Link>
  )
}

interface Props {
  rackets: RacketWithInsights[]
  defaultSort: SortKey
  showPrecoFilter: boolean
  showTextSearch?: boolean
  initialQuery?: string
  autoFocusSearch?: boolean
}

export default function DiscoveryFilters({ rackets, defaultSort, showPrecoFilter, showTextSearch, initialQuery, autoFocusSearch }: Props) {
  const [precoKey, setPrecoKey] = useState<string>('todas')
  const [marca, setMarca] = useState<string>('todas')
  const [sort, setSort] = useState<SortKey>(defaultSort)
  const [query, setQuery] = useState<string>(initialQuery ?? '')
  const searchRef = useRef<HTMLInputElement>(null)

  const brands = useMemo(() => {
    const seen = new Set<string>()
    for (const r of rackets) {
      const name = r.brands?.name
      if (name) seen.add(name)
    }
    return [...seen].sort()
  }, [rackets])

  const filtered = useMemo(() => {
    let out = [...rackets]

    if (showTextSearch && query.trim()) {
      const q = normalize(query.trim())
      out = out.filter(r =>
        normalize(r.name).includes(q) ||
        normalize(r.brands?.name ?? '').includes(q) ||
        normalize(r.nome_base ?? '').includes(q) ||
        (r.nome_base && r.model_year ? normalize(`${r.nome_base} ${r.model_year}`).includes(q) : false)
      )
    }

    if (showPrecoFilter && precoKey !== 'todas') {
      const bucket = PRECO_BUCKETS.find(b => b.label === precoKey)
      if (bucket) {
        out = out.filter(r => {
          const p = r.price ?? 0
          return p >= bucket.min && (bucket.max == null || p <= bucket.max)
        })
      }
    }

    if (marca !== 'todas') {
      out = out.filter(r => r.brands?.name === marca)
    }

    if (sort === 'menor-preco') {
      out.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    } else if (sort === 'maior-preco') {
      out.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    } else {
      // Lançamentos primeiro: model_year desc, created_at desc como desempate dentro do mesmo ano.
      out.sort((a, b) => {
        const anoDiff = (b.model_year ?? 0) - (a.model_year ?? 0)
        if (anoDiff !== 0) return anoDiff
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      })
    }

    return out
  }, [rackets, precoKey, marca, sort, showPrecoFilter])

  const hasActiveFilter = (showTextSearch && query.trim() !== '') || (showPrecoFilter && precoKey !== 'todas') || marca !== 'todas'

  function clearFilters() {
    setPrecoKey('todas')
    setMarca('todas')
    setQuery('')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        {showTextSearch && (
          <div className="relative">
            <MagnifyingGlass size={16} weight="regular" aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta/30 pointer-events-none" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nome ou marca..."
              autoFocus={autoFocusSearch}
              aria-label="Buscar raquete por nome ou marca"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-tinta/15 rounded-xl bg-white text-tinta placeholder:text-tinta/35 focus:outline-none focus:ring-2 focus:ring-aqua/40 focus:border-aqua transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tinta/30 hover:text-tinta/60 transition-colors"
              >
                <X size={14} weight="regular" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {showPrecoFilter && (
          <div className="-mr-5 md:mr-0 relative">
            <div className="flex gap-2 overflow-x-auto pb-1 pr-2 md:pr-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setPrecoKey('todas')}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium whitespace-nowrap ${
                  precoKey === 'todas'
                    ? 'bg-aqua text-white border-aqua'
                    : 'bg-white text-tinta/70 border-tinta/15 hover:border-aqua/50'
                }`}
              >
                Todas as faixas
              </button>
              {PRECO_BUCKETS.map(b => (
                <button
                  key={b.label}
                  onClick={() => setPrecoKey(b.label)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium whitespace-nowrap ${
                    precoKey === b.label
                      ? 'bg-aqua text-white border-aqua'
                      : 'bg-white text-tinta/70 border-tinta/15 hover:border-aqua/50'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-14 bg-gradient-to-l from-[#F7F3EC] to-transparent md:hidden" />
          </div>
        )}

        <div className="flex gap-2 md:gap-3 items-center">
          {brands.length > 1 && (
            <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1 md:flex-initial">
              <label className="hidden md:inline text-xs text-tinta/50 shrink-0">Marca</label>
              <select
                value={marca}
                onChange={e => setMarca(e.target.value)}
                className="w-full min-w-0 text-xs border border-tinta/15 rounded-xl px-2.5 py-1.5 bg-white text-tinta focus:outline-none focus:ring-1 focus:ring-aqua"
              >
                <option value="todas">Todas as marcas</option>
                {brands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1 md:flex-initial">
            <label className="hidden md:inline text-xs text-tinta/50 shrink-0">Ordenar</label>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="w-full min-w-0 text-xs border border-tinta/15 rounded-xl px-2.5 py-1.5 bg-white text-tinta focus:outline-none focus:ring-1 focus:ring-aqua"
            >
              <option value="lancamentos">Lançamentos primeiro</option>
              <option value="menor-preco">Menor preço</option>
              <option value="maior-preco">Maior preço</option>
            </select>
          </div>
        </div>
      </div>

      {/* Counter */}
      <p className="text-tinta/40 text-xs">
        {filtered.length}{' '}
        {filtered.length === 1 ? 'raquete disponível' : 'raquetes disponíveis'}
        {hasActiveFilter && ' com esses filtros'}
      </p>

      {/* Grid or empty state */}
      {filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(r => (
              <RacketCard key={r.id} racket={r} />
            ))}
          </div>
          {showTextSearch && query.trim() && (
            <NaoAcheiWidget key={query.trim()} termoInicial={query.trim()} origem="lista" />
          )}
        </>
      ) : (
        <div className="py-12 text-center flex flex-col items-center gap-2">
          {showTextSearch && query.trim() ? (
            <>
              <p className="text-tinta/50 text-sm">Nenhuma raquete encontrada para &ldquo;{query.trim()}&rdquo;.</p>
              <p className="text-tinta/40 text-xs">Tente outro nome ou marca.</p>
            </>
          ) : (
            <>
              <p className="text-tinta/50 text-sm">Nenhuma raquete com esses filtros.</p>
              <p className="text-tinta/40 text-xs">Tente outra faixa ou marca.</p>
            </>
          )}
          <button
            onClick={clearFilters}
            className="mt-1 text-xs text-aqua hover:underline font-medium"
          >
            Limpar filtros
          </button>
          {showTextSearch && query.trim() && (
            <NaoAcheiWidget key={query.trim()} termoInicial={query.trim()} origem="zero_results" />
          )}
        </div>
      )}
    </div>
  )
}
