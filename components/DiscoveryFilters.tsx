'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import type { RacketWithInsights } from '@/lib/recommend'
import RacketImageTile from './RacketImageTile'
import { NIVEL_LABEL } from './SpecsGrid'
import { derivarNivel } from '@/lib/nivel'

// Same canonical buckets as the chat (lib/agent/agent.ts PRECO_BUCKETS)
const PRECO_BUCKETS = [
  { label: 'Até R$1.000',       min: 0,    max: 1000 },
  { label: 'R$1.000 a R$2.000', min: 1001, max: 2000 },
  { label: 'R$2.000 a R$3.000', min: 2001, max: 3000 },
  { label: 'Mais de R$3.000',   min: 3001, max: null  },
] as const

export type SortKey = 'menor-preco' | 'maior-preco'

function RacketCard({ racket }: { racket: RacketWithInsights }) {
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null
  const _athleteRaw = (racket.specs_extra as Record<string, unknown> | null)?.atleta
  const athlete: string | undefined = Array.isArray(_athleteRaw)
    ? (_athleteRaw as string[]).filter(Boolean).join(' & ') || undefined
    : typeof _athleteRaw === 'string' ? _athleteRaw : undefined
  const nivel = derivarNivel(racket)

  return (
    <Link
      href={`/raquetes/${racket.slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-card border border-[rgba(14,58,64,0.06)] hover:-translate-y-1 hover:border-aqua/30 transition-all duration-200 flex flex-col"
    >
      <RacketImageTile src={racket.image_url} alt={racket.name} athlete={athlete} hoverScale />
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-tinta text-xs font-semibold leading-snug line-clamp-2 min-h-[33px]">{racket.name}</p>
        {price && <p className="text-coral font-bold text-sm">{price}</p>}
        {nivel && <p className="text-tinta/50 text-xs">{NIVEL_LABEL[nivel] ?? nivel}</p>}
      </div>
    </Link>
  )
}

interface Props {
  rackets: RacketWithInsights[]
  defaultSort: SortKey
  showPrecoFilter: boolean
}

export default function DiscoveryFilters({ rackets, defaultSort, showPrecoFilter }: Props) {
  const [precoKey, setPrecoKey] = useState<string>('todas')
  const [marca, setMarca] = useState<string>('todas')
  const [sort, setSort] = useState<SortKey>(defaultSort)

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
    } else {
      out.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    }

    return out
  }, [rackets, precoKey, marca, sort, showPrecoFilter])

  const hasActiveFilter = (showPrecoFilter && precoKey !== 'todas') || marca !== 'todas'

  function clearFilters() {
    setPrecoKey('todas')
    setMarca('todas')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        {showPrecoFilter && (
          <div className="flex flex-wrap gap-2">
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
        )}

        <div className="flex flex-wrap gap-3 items-center">
          {brands.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-tinta/50 shrink-0">Marca</label>
              <select
                value={marca}
                onChange={e => setMarca(e.target.value)}
                className="text-xs border border-tinta/15 rounded-lg px-2.5 py-1.5 bg-white text-tinta focus:outline-none focus:ring-1 focus:ring-aqua"
              >
                <option value="todas">Todas</option>
                {brands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs text-tinta/50 shrink-0">Ordenar</label>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="text-xs border border-tinta/15 rounded-lg px-2.5 py-1.5 bg-white text-tinta focus:outline-none focus:ring-1 focus:ring-aqua"
            >
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map(r => (
            <RacketCard key={r.id} racket={r} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center flex flex-col items-center gap-2">
          <p className="text-tinta/50 text-sm">Nenhuma raquete com esses filtros.</p>
          <p className="text-tinta/40 text-xs">Tente outra faixa ou marca.</p>
          <button
            onClick={clearFilters}
            className="mt-1 text-xs text-aqua hover:underline font-medium"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  )
}
