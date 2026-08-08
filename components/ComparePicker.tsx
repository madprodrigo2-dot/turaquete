'use client'

import { useState, useMemo, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { RacketWithInsights } from '@/lib/recommend'
import RacketImageTile from './RacketImageTile'
import { ArrowRight } from '@phosphor-icons/react'

const COLORS: Record<'A' | 'B', string> = { A: '#FF5E3A', B: '#0CC0BE' }

// Fixed popular pairs — slugs verified 2026-07-06
const POPULAR_PAIRS = [
  { a: { slug: 'nox-ng17-luxury-2025', short: 'NG17 Luxury 2025' }, b: { slug: 'nox-ng17-2026', short: 'NG17 2026' } },
  { a: { slug: 'proteo-25', short: 'Proteo 2025' }, b: { slug: 'proteo-2026', short: 'Proteo 2026' } },
  { a: { slug: 'aura-2026', short: 'Aura 2026' }, b: { slug: 'fierce', short: 'Fierce' } },
  { a: { slug: 'ceu', short: 'CÉU' }, b: { slug: 'rebel-25', short: 'Rebel 25' } },
  { a: { slug: 'kronos-6th-generation', short: 'Kronos 6th Gen' }, b: { slug: 'kronos-gold-titanium', short: 'Kronos Gold Ti.' } },
  { a: { slug: 'z-bruxo-2026', short: 'Z Bruxo 2026' }, b: { slug: 'z-soft', short: 'Z Soft' } },
]

interface Props {
  rackets: RacketWithInsights[]
  initialSlotA?: RacketWithInsights
  initialSlotB?: RacketWithInsights
  popularPairs?: { name: string; slug: string }[][]
}

export default function ComparePicker({ rackets, initialSlotA, initialSlotB, popularPairs }: Props) {
  const router = useRouter()
  const [slotA, setSlotA] = useState<RacketWithInsights | null>(initialSlotA ?? null)
  const [slotB, setSlotB] = useState<RacketWithInsights | null>(initialSlotB ?? null)
  const [focusedSlot, setFocusedSlot] = useState<'A' | 'B'>(initialSlotA && !initialSlotB ? 'B' : 'A')
  const [query, setQuery] = useState('')
  const [comparing, setComparing] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const isEmpty = !slotA && !slotB

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rackets
    return rackets.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.brands?.name ?? '').toLowerCase().includes(q)
    )
  }, [rackets, query])

  function selectRacket(r: RacketWithInsights) {
    const isInA = slotA?.id === r.id
    const isInB = slotB?.id === r.id
    if (focusedSlot === 'A') {
      setSlotA(r)
      if (isInB) setSlotB(null)
      if (!slotB || isInB) setFocusedSlot('B')
    } else {
      setSlotB(r)
      if (isInA) setSlotA(null)
      if (!slotA || isInA) setFocusedSlot('A')
    }
    setQuery('')
  }

  function clearSlot(slot: 'A' | 'B', e: React.SyntheticEvent) {
    e.stopPropagation()
    if (slot === 'A') { setSlotA(null); setFocusedSlot('A') }
    else { setSlotB(null); setFocusedSlot('B') }
  }

  function handlePopularClick(slugA: string, slugB: string) {
    if (typeof window !== 'undefined') {
      (window as Window & { gtag?: (...args: unknown[]) => void }).gtag?.(
        'event', 'comparacao_popular_click', { par: `${slugA}-vs-${slugB}` }
      )
    }
    router.push(`/comparar/${slugA}-vs-${slugB}`)
  }

  const canCompare = slotA && slotB && slotA.id !== slotB.id

  return (
    <div className="flex flex-col gap-5">
      {/* Slot cards with VS + radar watermark behind */}
      <div className="relative">
        {/* Radar/hexagon watermark — aqua ~6%, only visible in empty state */}
        {isEmpty && (
          <svg
            viewBox="0 0 220 120"
            className="absolute inset-0 w-full h-full pointer-events-none select-none"
            aria-hidden="true"
          >
            <g transform="translate(110,60)">
              <polygon points="0,-52 45,-26 45,26 0,52 -45,26 -45,-26" fill="none" stroke="#0CC0BE" strokeWidth="0.9" opacity="0.09"/>
              <polygon points="0,-35 30,-17.5 30,17.5 0,35 -30,17.5 -30,-17.5" fill="none" stroke="#0CC0BE" strokeWidth="0.9" opacity="0.09"/>
              <polygon points="0,-17 15,-8.5 15,8.5 0,17 -15,8.5 -15,-8.5" fill="none" stroke="#0CC0BE" strokeWidth="0.9" opacity="0.09"/>
              <line x1="0" y1="-52" x2="0" y2="52" stroke="#0CC0BE" strokeWidth="0.5" opacity="0.06"/>
              <line x1="-45" y1="-26" x2="45" y2="26" stroke="#0CC0BE" strokeWidth="0.5" opacity="0.06"/>
              <line x1="-45" y1="26" x2="45" y2="-26" stroke="#0CC0BE" strokeWidth="0.5" opacity="0.06"/>
            </g>
          </svg>
        )}

        <div className="flex items-stretch gap-2">
          {(['A', 'B'] as const).map((slot, idx) => {
            const selected = slot === 'A' ? slotA : slotB
            const color = COLORS[slot]
            const isFocused = focusedSlot === slot
            return (
              <Fragment key={slot}>
                {idx === 1 && (
                  <div className="flex items-center justify-center w-7 shrink-0">
                    <span className="font-heading font-black text-base text-tinta/20 select-none leading-none">VS</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setFocusedSlot(slot)
                    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className="relative flex-1 rounded-xl border-2 overflow-hidden text-left transition-all"
                  style={{
                    borderColor: isFocused ? color : `${color}35`,
                    boxShadow: isFocused ? `0 0 0 3px ${color}20` : undefined,
                  }}
                  aria-label={selected ? `Raquete ${slot}: ${selected.name} — clique para trocar` : `Raquete ${slot} — clique para selecionar`}
                >
                  {selected ? (
                    <>
                      <RacketImageTile src={selected.image_url} alt={selected.name} />
                      <div className="px-2.5 py-2 bg-white">
                        <p className="text-[11px] font-semibold text-tinta leading-snug line-clamp-2 min-h-[30px]">
                          {selected.name}
                        </p>
                        {selected.price != null && (
                          <p className="text-[11px] font-bold mt-0.5" style={{ color }}>
                            R${selected.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </p>
                        )}
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={e => clearSlot(slot, e)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearSlot(slot, e) } }}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/40 text-white text-xs font-bold flex items-center justify-center hover:bg-black/60 z-10 leading-none cursor-pointer select-none"
                        aria-label={`Remover raquete ${slot}`}
                      >
                        ×
                      </span>
                    </>
                  ) : (
                    /* Empty slot */
                    <div
                      className="h-full flex flex-col items-center justify-center gap-1.5"
                      style={{ backgroundColor: '#EAF7F6' }}
                    >
                      <div className="relative w-24 h-24">
                        <Image
                          src="/lupa-comparar.webp"
                          alt=""
                          fill
                          className="object-contain"
                          sizes="96px"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-0.5 px-3">
                        <span className="text-sm font-semibold text-tinta/80 text-center leading-snug">Escolher raquete</span>
                        <span className="text-xs text-tinta/50 text-center leading-snug">toque para comparar</span>
                      </div>
                    </div>
                  )}
                  {isFocused && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: color }} />
                  )}
                </button>
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* Compare CTA */}
      {canCompare ? (
        <button
          onClick={() => {
            if (comparing) return
            setComparing(true)
            router.push(`/comparar/${slotA.slug}-vs-${slotB.slug}`)
          }}
          disabled={comparing}
          className={`w-full font-semibold text-base py-4 rounded-2xl transition-all shadow-md ${
            comparing
              ? 'bg-coral/80 text-white cursor-wait'
              : 'bg-coral text-white hover:opacity-90 active:scale-[0.98]'
          }`}
        >
          {comparing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
              Comparando…
            </span>
          ) : 'Comparar'}
        </button>
      ) : (
        <div className="w-full bg-gray-100 text-tinta/30 font-semibold text-base py-4 rounded-2xl text-center select-none">
          Comparar
        </div>
      )}

      {/* Comparações populares — só no estado vazio */}
      {isEmpty && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-tinta/60">Ou comece por uma comparação popular</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {POPULAR_PAIRS.map((pair) => (
              <button
                key={`${pair.a.slug}-${pair.b.slug}`}
                onClick={() => handlePopularClick(pair.a.slug, pair.b.slug)}
                className="flex flex-col rounded-2xl border border-aqua/15 bg-white hover:border-aqua/40 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.97] transition-all duration-200 overflow-hidden text-left"
              >
                <div className="flex items-center justify-center gap-1 px-2 pt-3 pb-1">
                  <div className="relative w-[44px] h-[56px] shrink-0">
                    <Image
                      src={`/raquetes/${pair.a.slug}.webp`}
                      alt={pair.a.short}
                      fill
                      className="object-contain"
                      sizes="44px"
                    />
                  </div>
                  <span className="text-[10px] font-black text-tinta/22 shrink-0 leading-none select-none">vs</span>
                  <div className="relative w-[44px] h-[56px] shrink-0">
                    <Image
                      src={`/raquetes/${pair.b.slug}.webp`}
                      alt={pair.b.short}
                      fill
                      className="object-contain"
                      sizes="44px"
                    />
                  </div>
                </div>
                <div className="px-2.5 pb-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-tinta/70 leading-snug line-clamp-1">{pair.a.short}</span>
                  <span className="text-[10px] text-tinta/38 leading-snug line-clamp-1">{pair.b.short}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div ref={searchRef} className="flex flex-col gap-3">
        <p className="text-sm text-tinta/50">
          Selecionando para:{' '}
          <span className="font-semibold" style={{ color: COLORS[focusedSlot] }}>
            Raquete {focusedSlot}
          </span>
        </p>
        <input
          type="search"
          placeholder="Buscar por nome ou marca..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full border border-aqua/30 rounded-xl px-4 py-3 text-sm text-tinta placeholder-tinta/30 bg-white focus:outline-none focus:ring-2 focus:ring-aqua/30"
        />

        <div className="flex flex-col gap-1 max-h-[52vh] overflow-y-auto -mx-1 px-1">
          {filtered.map(r => {
            const isA = slotA?.id === r.id
            const isB = slotB?.id === r.id
            const badge = isA ? 'A' : isB ? 'B' : null
            const badgeColor = isA ? COLORS.A : COLORS.B
            return (
              <button
                key={r.id}
                onClick={() => selectRacket(r)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left"
                style={{
                  borderColor: badge ? `${badgeColor}50` : '#0CC0BE18',
                  backgroundColor: badge ? `${badgeColor}08` : 'white',
                }}
              >
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-sm font-medium text-tinta leading-snug line-clamp-1">
                    {r.name}
                  </span>
                  {r.brands?.name && (
                    <span className="text-xs text-tinta/40">{r.brands.name}</span>
                  )}
                </div>
                {r.price != null && (
                  <span className="text-xs text-tinta/40 tabular-nums shrink-0">
                    R${r.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </span>
                )}
                {badge && (
                  <span
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0 leading-none"
                    style={{ color: badgeColor, backgroundColor: `${badgeColor}18` }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-tinta/40 text-sm text-center py-6">Nenhuma raquete encontrada</p>
          )}
        </div>

        {/* Popular pairs — dynamic from server, shown inside search area */}
        {popularPairs && popularPairs.length > 0 && (
          <div className="pt-4 border-t border-aqua/10">
            <p className="text-xs text-tinta/40 font-medium mb-2">Comparações populares</p>
            <div className="flex flex-col gap-1.5">
              {popularPairs.map((pair, i) => {
                const a = pair[0], b = pair[1]
                if (!a || !b) return null
                return (
                  <Link
                    key={i}
                    href={`/comparar/${a.slug}-vs-${b.slug}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-aqua/12 bg-white hover:-translate-y-0.5 hover:border-aqua/30 hover:shadow-sm transition-all duration-200"
                  >
                    <span className="text-sm text-tinta/70 leading-snug flex-1 min-w-0 truncate">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-tinta/35 mx-1.5">vs</span>
                      <span className="font-medium">{b.name}</span>
                    </span>
                    <ArrowRight size={14} weight="regular" aria-hidden="true" className="shrink-0 ml-2 text-aqua/50" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
