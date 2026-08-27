'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { RacketWithInsights } from '@/lib/recommend'
import { getDisplayName } from '@/lib/displayName'
import RacketImageTile from '@/components/RacketImageTile'
import { derivarNivel } from '@/lib/nivel'
import { PRECO_BUCKETS } from '@/lib/agent/preco-buckets'
import type { SortKey } from '@/components/DiscoveryFilters'

// Specs duras — núcleo · espessura · material da face. Mesma lógica de
// DiscoveryFilters.tsx / SpecsGrid, só o que já existe no banco.
function buildSpecLine(racket: RacketWithInsights): string | null {
  const parts: string[] = []
  if (racket.core) parts.push(racket.core)
  const esp = (racket.specs_extra as Record<string, unknown> | null)?.espessura_mm
  if (typeof esp === 'number') parts.push(`${esp}mm`)
  if (racket.face_material) parts.push(racket.face_material)
  return parts.length > 0 ? parts.join(' · ') : null
}

const NIVEL_CARD: Record<string, { label: string; cls: string }> = {
  iniciante:     { label: 'Iniciante',     cls: 'text-emerald-600 bg-emerald-50' },
  intermediario: { label: 'Intermediário', cls: 'text-amber-600  bg-amber-50'   },
  avancado:      { label: 'Avançado',      cls: 'text-coral      bg-coral/10'   },
}

const NIVEL_FILTROS = [
  { key: 'iniciante',     label: 'Iniciante' },
  { key: 'intermediario', label: 'Intermediário' },
  { key: 'avancado',      label: 'Avançado' },
] as const
type NivelKey = (typeof NIVEL_FILTROS)[number]['key'] | 'todos'

function RacketGridCard({ racket }: { racket: RacketWithInsights }) {
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null
  const _athleteRaw = (racket.specs_extra as Record<string, unknown> | null)?.atleta
  const athlete: string | undefined = Array.isArray(_athleteRaw)
    ? (_athleteRaw as string[]).filter(Boolean).join(' & ') || undefined
    : typeof _athleteRaw === 'string' ? _athleteRaw : undefined
  const specLine = buildSpecLine(racket)
  const nivel = derivarNivel(racket)

  return (
    <Link
      href={`/raquetes/${racket.slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-aqua/20 shadow-sm hover:shadow-md hover:border-aqua/40 transition-all flex flex-col"
    >
      <RacketImageTile src={racket.image_url} alt={racket.name} athlete={athlete} hoverScale />
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-tinta text-xs font-semibold leading-snug line-clamp-2 min-h-[33px]">{getDisplayName(racket)}</p>
        {price && <p className="text-coral font-bold text-sm">{price}</p>}
        {specLine && (
          <p className="text-tinta/50 text-[10.5px] leading-snug">{specLine}</p>
        )}
        {nivel && NIVEL_CARD[nivel] && (
          <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 w-fit leading-tight ${NIVEL_CARD[nivel].cls}`}>
            {NIVEL_CARD[nivel].label}
          </span>
        )}
      </div>
    </Link>
  )
}

export default function MarcaGrid({ rackets }: { rackets: RacketWithInsights[] }) {
  const [precoKey, setPrecoKey] = useState<string>('todas')
  const [nivelKey, setNivelKey] = useState<NivelKey>('todos')
  const [sort, setSort] = useState<SortKey>('lancamentos')

  const filtered = useMemo(() => {
    let out = [...rackets]

    if (precoKey !== 'todas') {
      const bucket = PRECO_BUCKETS.find(b => b.label === precoKey)
      if (bucket) {
        out = out.filter(r => {
          const p = r.price ?? 0
          return p >= bucket.min && (bucket.max == null || p <= bucket.max)
        })
      }
    }

    if (nivelKey !== 'todos') {
      out = out.filter(r => derivarNivel(r) === nivelKey)
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
  }, [rackets, precoKey, nivelKey, sort])

  const hasActiveFilter = precoKey !== 'todas' || nivelKey !== 'todos'

  function clearFilters() {
    setPrecoKey('todas')
    setNivelKey('todos')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3">
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

        <div className="flex gap-2 md:gap-3 items-center">
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1 md:flex-initial">
            <label className="hidden md:inline text-xs text-tinta/50 shrink-0">Nível</label>
            <select
              value={nivelKey}
              onChange={e => setNivelKey(e.target.value as NivelKey)}
              className="w-full min-w-0 text-xs border border-tinta/15 rounded-xl px-2.5 py-1.5 bg-white text-tinta focus:outline-none focus:ring-1 focus:ring-aqua"
            >
              <option value="todos">Todos os níveis</option>
              {NIVEL_FILTROS.map(n => (
                <option key={n.key} value={n.key}>{n.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1 md:flex-initial md:ml-auto">
            <label className="hidden md:inline text-xs text-tinta/50 shrink-0">Ordenar</label>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="w-full min-w-0 text-xs border border-tinta/15 rounded-xl px-2.5 py-1.5 bg-white text-tinta focus:outline-none focus:ring-1 focus:ring-aqua"
            >
              <option value="lancamentos">Lançamentos</option>
              <option value="menor-preco">Menor preço</option>
              <option value="maior-preco">Maior preço</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contador */}
      <p className="text-tinta/40 text-xs">
        {filtered.length}{' '}
        {filtered.length === 1 ? 'raquete disponível' : 'raquetes disponíveis'}
        {hasActiveFilter && ' com esses filtros'}
      </p>

      {/* Grid ou empty state */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(r => (
            <RacketGridCard key={r.id} racket={r} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center flex flex-col items-center gap-2">
          <p className="text-tinta/50 text-sm">Nenhuma raquete com esses filtros.</p>
          <p className="text-tinta/40 text-xs">Tente outra faixa ou nível.</p>
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
