'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RacketWithInsights } from '@/lib/recommend'
import RacketImageTile from './RacketImageTile'

const COLORS: Record<'A' | 'B', string> = { A: '#FF5E3A', B: '#0CC0BE' }

interface Props {
  rackets: RacketWithInsights[]
  initialSlotA?: RacketWithInsights
}

export default function ComparePicker({ rackets, initialSlotA }: Props) {
  const router = useRouter()
  const [slotA, setSlotA] = useState<RacketWithInsights | null>(initialSlotA ?? null)
  const [slotB, setSlotB] = useState<RacketWithInsights | null>(null)
  const [focusedSlot, setFocusedSlot] = useState<'A' | 'B'>(initialSlotA ? 'B' : 'A')
  const [query, setQuery] = useState('')

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

  function clearSlot(slot: 'A' | 'B', e: React.MouseEvent) {
    e.stopPropagation()
    if (slot === 'A') { setSlotA(null); setFocusedSlot('A') }
    else { setSlotB(null); setFocusedSlot('B') }
  }

  const canCompare = slotA && slotB && slotA.id !== slotB.id

  return (
    <div className="flex flex-col gap-5">
      {/* Slot cards */}
      <div className="grid grid-cols-2 gap-3">
        {(['A', 'B'] as const).map(slot => {
          const selected = slot === 'A' ? slotA : slotB
          const color = COLORS[slot]
          const isFocused = focusedSlot === slot
          return (
            <button
              key={slot}
              onClick={() => setFocusedSlot(slot)}
              className="relative rounded-xl border-2 overflow-hidden text-left transition-all"
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
                  <button
                    onClick={e => clearSlot(slot, e)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/40 text-white text-xs font-bold flex items-center justify-center hover:bg-black/60 z-10 leading-none"
                    aria-label={`Remover raquete ${slot}`}
                  >
                    ×
                  </button>
                </>
              ) : (
                <div
                  className="aspect-[800/1020] flex flex-col items-center justify-center gap-1.5"
                  style={{ backgroundColor: `${color}08` }}
                >
                  <span className="text-3xl font-light leading-none" style={{ color, opacity: 0.35 }}>+</span>
                  <span className="text-xs text-tinta/40 text-center px-2 leading-snug">
                    Raquete {slot}
                  </span>
                </div>
              )}
              {isFocused && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: color }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Compare CTA */}
      {canCompare ? (
        <button
          onClick={() => router.push(`/comparar/${slotA.slug}-vs-${slotB.slug}`)}
          className="w-full bg-coral text-white font-semibold text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
        >
          Comparar
        </button>
      ) : (
        <div className="w-full bg-gray-100 text-tinta/30 font-semibold text-base py-4 rounded-2xl text-center select-none">
          Comparar
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col gap-3">
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
      </div>
    </div>
  )
}
