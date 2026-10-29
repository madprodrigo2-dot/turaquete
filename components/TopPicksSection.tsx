'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Star } from '@phosphor-icons/react'
import type { RacketWithInsights } from '@/lib/recommend'
import DiscoveryRacketCard from './DiscoveryRacketCard'

interface Props {
  rackets: RacketWithInsights[]
  title: string
  subtitle: string
}

// Seção fixa acima da grade completa (DiscoveryFilters) nas páginas de nível —
// resolve a queixa do Rodrigo de que "as melhores se perdem entre as demais".
// V3 (2026-10-29): fundo com o token --color-gold/--color-gold-deep (tom
// "Âmbar Coral" — formalizado em app/globals.css a meio caminho entre
// --color-yellow e --color-coral, pra não introduzir um dourado desconectado
// da paleta), Tury como curadora e carrossel com swipe no mobile — no desktop
// as 3 cards cabem numa linha só, então vira grid sem scroll (mesma faixa de
// largura do container, não precisa de scroll ali). Ranking vem de
// getTopRaquetasPorNivel() (recs reais do chat, 30d, filtradas pelo nível que
// o usuário confirmou). Mesmo card da grade abaixo — é destaque de
// posição/contexto, não um visual novo. A ordem de `rackets` ainda define
// quem aparece e em que posição, mas é só lógica interna — Rodrigo decidiu
// não expor 1º/2º/3º pro usuário (testamos medalha, fita e numeral gigante;
// nenhum convenceu), por isso nenhuma das 3 cards é individualizada aqui.
export default function TopPicksSection({ rackets, title, subtitle }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  if (rackets.length === 0) return null

  function syncState() {
    const el = trackRef.current
    const first = el?.children[0] as HTMLElement | undefined
    if (!el || !first) return
    const step = first.offsetWidth + 12 // gap-3
    const idx = Math.round(el.scrollLeft / step)
    setActiveIdx(Math.min(rackets.length - 1, Math.max(0, idx)))
  }

  function scrollToIdx(idx: number) {
    const el = trackRef.current
    const card = el?.children[idx] as HTMLElement | undefined
    if (!el || !card) return
    el.scrollTo({ left: card.offsetLeft, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-3 bg-gradient-to-br from-gold to-gold-deep border border-black/15 rounded-2xl p-4 md:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
      {/* Header — Tury como curadora, selo dourado "Top 3" */}
      <div className="flex items-center gap-3">
        <Image
          src="/tury-transparente-explicando.png"
          alt="Tury"
          width={443}
          height={563}
          className="h-14 md:h-16 w-auto object-contain shrink-0"
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="inline-flex items-center gap-1 self-start text-[9px] font-bold uppercase tracking-wider text-tinta bg-gold-light rounded-full px-2 py-0.5 w-fit">
            <Star size={10} weight="fill" aria-hidden="true" />
            Top 3
          </span>
          <p className="font-heading font-bold text-white text-sm md:text-base leading-tight mt-0.5">{title}</p>
          <p className="text-white/70 text-xs">{subtitle}</p>
        </div>
      </div>

      {/* Mobile: carrossel com swipe (snap-x). Desktop: as 3 cabem numa grade sem scroll. */}
      <div
        ref={trackRef}
        onScroll={syncState}
        className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-visible scroll-smooth snap-x snap-mandatory md:snap-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {rackets.map((r) => (
          <div key={r.id} className="w-[260px] md:w-auto shrink-0 md:shrink snap-start md:snap-align-none">
            <DiscoveryRacketCard racket={r} />
          </div>
        ))}
      </div>

      {/* Dots — só no mobile, onde a lista realmente rola */}
      {rackets.length > 1 && (
        <div className="flex md:hidden justify-center gap-1.5" role="group" aria-label="Navegação do top 3">
          {rackets.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIdx(i)}
              aria-label={`Ir para a ${i + 1}ª recomendação`}
              aria-current={i === activeIdx ? 'true' : undefined}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === activeIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
