'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { sendGAEvent } from '@next/third-parties/google'
import { Brand, RacketWithInsights } from '@/lib/recommend'
import InsightsModal from './InsightsModal'
import RacketImageTile from './RacketImageTile'
import AthleteBadge from './AthleteBadge'

interface Props {
  onStart: () => void
  brands: Brand[]
  featuredRackets: RacketWithInsights[]
  featuredSource: 'real' | 'curated'
  athleteRackets: RacketWithInsights[]
  recsCount: number
}

// Threshold definido por Rodrigo — abaixo disso usa texto alternativo sem número
const RECS_THRESHOLD = 50

// Perguntas reais anonimizadas curadas manualmente — atualizar conforme o painel cresce
// Fonte: primeiras mensagens reais de usuários (starters e mensagens livres do painel)
const CURATED_QUESTIONS = [
  'Tenho dor no cotovelo',
  'Quero trocar minha raquete',
  'Sou iniciante',
  'Jogo mais na defesa',
]

const BADGES = ['Grátis', '1 minuto', 'Sem cadastro']

const STEPS: { label: string; desc?: string }[] = [
  { label: 'Conte como você joga, do seu jeito' },
  { label: 'O especialista entende seu perfil' },
  {
    label: 'Receba seu perfil e as raquetes certas',
    desc: 'O especialista te diz o peso e balance ideais pro seu jogo, e indica as raquetes que batem exatamente com esse perfil.',
  },
]

const FAQS = [
  {
    q: 'É grátis mesmo?',
    a: 'Sim. Você conta como joga e recebe as recomendações na hora. Sem cadastro, sem plano, sem custo de nenhum tipo.',
  },
  {
    q: 'Como vocês escolhem as raquetes?',
    a: 'Com base nas especificações reais de cada raquete: peso, balance, material do núcleo e da face. Sem achismo, sem patrocínio.',
  },
  {
    q: 'Vocês vendem raquetes?',
    a: 'Não. Indicamos onde comprar (Mercado Livre e lojas parceiras) com o link direto. A Turaquete não tem estoque nem processa pagamentos.',
  },
]

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconNivel() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2"   y="15" width="5" height="7" rx="1" fill="#0CC0BE" />
      <rect x="9.5" y="10" width="5" height="12" rx="1" fill="#0CC0BE" />
      <rect x="17"  y="4"  width="5" height="18" rx="1" fill="#0CC0BE" />
    </svg>
  )
}

function IconEstilo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="9.5" rx="6" ry="7.5" fill="#0CC0BE" />
      <rect x="10.5" y="16" width="3" height="7" rx="1.5" fill="#0CC0BE" />
    </svg>
  )
}

function IconBraco() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L4 5.5v5.5C4 16 7.5 20.5 12 22c4.5-1.5 8-6 8-11V5.5L12 2z" fill="#0CC0BE" />
      <path d="M8.5 12l2.5 2.5 4.5-4.5" stroke="#0E3A40" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconOrcamento() {
  return <Wallet size={24} color="#0CC0BE" aria-hidden="true" />
}

const ANALYSIS_ITEMS = [
  { Icon: IconNivel,     label: 'Seu nível' },
  { Icon: IconEstilo,    label: 'Seu estilo de jogo' },
  { Icon: IconBraco,     label: 'Dores no braço' },
  { Icon: IconOrcamento, label: 'Orçamento' },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusIndicator({ status }: { status: Brand['status'] }) {
  if (status === 'disponivel') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-emerald-600 text-xs font-medium">Disponível</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex rounded-full h-2 w-2 bg-gray-300" />
      <span className="text-gray-400 text-xs font-medium">Em breve</span>
    </div>
  )
}

function AthleteRacketCard({ racket }: { racket: RacketWithInsights }) {
  const athlete = (racket.specs_extra as Record<string, unknown> | null)?.atleta as string | undefined
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null

  return (
    <Link
      href={`/raquetes/${racket.slug}`}
      onClick={() => sendGAEvent({ event: 'racket_atleta_aberta', slug: racket.slug })}
      className="block shrink-0 w-[130px] group"
    >
      <div className="bg-white rounded-2xl overflow-hidden border border-aqua/20 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="relative h-40 bg-white flex items-center justify-center overflow-hidden shrink-0">
          {racket.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={racket.image_url} alt={racket.name} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <ellipse cx="12" cy="9.5" rx="6" ry="7.5" fill="#0CC0BE" opacity="0.4" />
              <rect x="10.5" y="16" width="3" height="7" rx="1.5" fill="#0CC0BE" opacity="0.4" />
            </svg>
          )}
          {athlete && (
            <div className="absolute top-1.5 left-1.5 z-10 max-w-[calc(100%-12px)]">
              <AthleteBadge athlete={athlete} />
            </div>
          )}
        </div>
        <div className="px-2.5 py-2 flex flex-col flex-1">
          <p className="font-heading text-tinta text-[10px] font-semibold leading-tight line-clamp-2 min-h-[25px]">{racket.name}</p>
          {price && <p className="font-heading text-coral font-bold text-xs mt-0.5">{price}</p>}
        </div>
      </div>
    </Link>
  )
}

function BrandCard({ brand }: { brand: Brand }) {
  const isAvailable = brand.status === 'disponivel'

  const inner = (
    <>
      {brand.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.logo_url}
          alt={brand.name}
          className={`h-7 w-auto max-w-[120px] object-contain ${isAvailable ? '' : 'opacity-40 grayscale'}`}
        />
      ) : (
        <span className={`text-sm font-medium ${isAvailable ? 'text-tinta' : 'text-tinta/50'}`}>
          {brand.name}
        </span>
      )}
      <div className="flex items-center gap-2 shrink-0">
        <StatusIndicator status={brand.status} />
        {isAvailable && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-aqua shrink-0" aria-hidden="true">
            <path d="M5 2.5l4.5 4.5L5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </>
  )

  if (isAvailable) {
    return (
      <Link
        href={`/marcas/${brand.slug}`}
        onClick={() => sendGAEvent({ event: 'marca_aberta', slug: brand.slug })}
        className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-aqua/20 shadow-sm hover:shadow-md hover:border-aqua/40 active:scale-[0.98] active:bg-aqua/5 transition-all"
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-aqua/10 shadow-sm opacity-70 cursor-default select-none">
      {inner}
    </div>
  )
}

function FeaturedCard({ racket }: { racket: RacketWithInsights }) {
  const [modalOpen, setModalOpen] = useState(false)

  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null
  const perfil   = racket.racket_insights?.perfil_resumo ?? null
  const athlete  = (racket.specs_extra as Record<string, unknown> | null)?.atleta as string | undefined
  const hasLink  = !!(racket.affiliate_url ?? racket.source_url)
  const ctaHref  = hasLink ? `/ir/${racket.slug}` : null
  const linkTipo = racket.affiliate_url ? 'afiliado' : 'oficial'

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden border border-aqua/20 shadow-arena flex flex-col h-full">
        <Link href={`/raquetes/${racket.slug}`} className="block">
          <RacketImageTile src={racket.image_url} alt={racket.name} athlete={athlete} />
        </Link>
        <div className="p-3 flex flex-col gap-2 flex-1">
          <Link href={`/raquetes/${racket.slug}`}>
            <p className="font-heading text-tinta text-xs font-semibold leading-snug line-clamp-2 hover:text-aqua transition-colors min-h-[33px]">
              {racket.name}
            </p>
          </Link>
          {perfil && (
            <p className="text-tinta/55 text-[10px] leading-snug line-clamp-2">{perfil}</p>
          )}
          {price && <p className="font-heading text-coral font-bold text-sm">{price}</p>}
          {ctaHref ? (
            <a
              href={ctaHref}
              target="_blank"
              rel={`noopener noreferrer${linkTipo === 'afiliado' ? ' sponsored' : ''}`}
              onClick={() => sendGAEvent({ event: linkTipo === 'afiliado' ? 'clique_afiliado' : 'clique_loja_oficial', racket: racket.slug })}
              className="mt-auto w-full text-center border border-aqua text-tinta text-xs font-semibold py-2 rounded-xl hover:bg-aqua/10 active:bg-aqua/20 active:scale-[0.98] transition-all leading-tight"
            >
              Quero esta raquete
            </a>
          ) : (
            <span className="mt-auto w-full text-center rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold py-2 cursor-not-allowed select-none block">
              Em breve nas lojas
            </span>
          )}
          {racket.racket_insights && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 text-[10px] text-tinta/40 hover:text-aqua transition-colors w-fit"
            >
              <svg width="11" height="11" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <polygon points="6.5,1 11.5,3.8 11.5,9.2 6.5,12 1.5,9.2 1.5,3.8" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                <line x1="6.5" y1="4" x2="6.5" y2="9" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5"/>
                <line x1="3.7" y1="5.5" x2="9.3" y2="7.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5"/>
                <line x1="3.7" y1="7.5" x2="9.3" y2="5.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5"/>
              </svg>
              Ver análise
            </button>
          )}
        </div>
      </div>
      <InsightsModal racket={racket} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

// ── Carousel ──────────────────────────────────────────────────────────────────

function FeaturedCarousel({ rackets }: { rackets: RacketWithInsights[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)
  // maxIdx = highest index that can actually be scrolled to (varies by viewport).
  // On desktop (3 cards visible) fewer positions are reachable than rackets.length - 1.
  const [maxIdx, setMaxIdx] = useState(rackets.length - 1)

  const computeMaxIdx = () => {
    const el = trackRef.current
    if (!el || el.children.length === 0) return
    const maxScroll = el.scrollWidth - el.clientWidth
    const scrollPadding = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0
    for (let i = rackets.length - 1; i >= 0; i--) {
      const card = el.children[i] as HTMLElement | null
      if (!card) continue
      if (card.offsetLeft - scrollPadding <= maxScroll + 2) {
        setMaxIdx(i)
        return
      }
    }
    setMaxIdx(0)
  }

  const syncState = () => {
    const el = trackRef.current
    if (!el) return
    const { scrollLeft, clientWidth, scrollWidth } = el
    setAtStart(scrollLeft <= 2)
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 2)
    const firstCard = el.children[0] as HTMLElement | null
    if (!firstCard) return
    const step = firstCard.offsetWidth + 12 // gap-3 = 12px
    setActiveIdx(Math.round(scrollLeft / step))
  }

  useEffect(() => {
    syncState()
    computeMaxIdx()
    const el = trackRef.current
    if (!el) return
    const ro = new ResizeObserver(() => { computeMaxIdx(); syncState() })
    ro.observe(el)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToIdx = (idx: number) => {
    const el = trackRef.current
    if (!el) return
    const card = el.children[idx] as HTMLElement | null
    if (!card) return
    const scrollPadding = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0
    el.scrollTo({ left: card.offsetLeft - scrollPadding, behavior: 'smooth' })
  }

  const arrowCls = (disabled: boolean) =>
    `hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border shadow-sm items-center justify-center transition-all
     ${disabled ? 'opacity-30 cursor-not-allowed border-gray-200 text-gray-300' : 'border-aqua/30 text-tinta/60 hover:border-aqua/60 hover:text-tinta hover:shadow-md'}`

  // Number of navigable positions = maxIdx + 1 (reachable slides only)
  const dotCount = maxIdx + 1

  return (
    <div className="relative">
      {/* Prev arrow */}
      <button
        onClick={() => scrollToIdx(Math.max(0, activeIdx - 1))}
        disabled={atStart}
        aria-label="Raquetes anteriores"
        className={`${arrowCls(atStart)} left-0 -translate-x-full -ml-2`}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M8.5 2L4 6.5l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Track — breaks out of parent padding on mobile, contained on desktop */}
      <div className="-mx-5 md:mx-0">
        <div
          ref={trackRef}
          onScroll={syncState}
          className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pl-5 pr-5 md:pl-0 md:pr-0 scroll-pl-5 md:scroll-pl-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {rackets.map(racket => (
            <div
              key={racket.id}
              className="w-[calc(100vw-64px)] md:w-[calc((100%-24px)/3)] shrink-0 snap-start"
            >
              <FeaturedCard racket={racket} />
            </div>
          ))}
        </div>
      </div>

      {/* Next arrow — clamped to maxIdx so it never tries an unreachable position */}
      <button
        onClick={() => scrollToIdx(Math.min(maxIdx, activeIdx + 1))}
        disabled={atEnd}
        aria-label="Próximas raquetes"
        className={`${arrowCls(atEnd)} right-0 translate-x-full ml-2`}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M4.5 2L9 6.5 4.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dots — only as many as positions that are actually reachable */}
      {dotCount > 1 && (
        <div className="flex justify-center gap-1.5 mt-3" role="group" aria-label="Navegação do carrossel">
          {Array.from({ length: dotCount }, (_, idx) => (
            <button
              key={idx}
              onClick={() => scrollToIdx(idx)}
              aria-label={`Ir para raquete ${idx + 1}`}
              aria-current={idx === activeIdx ? 'true' : undefined}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === activeIdx ? 'w-4 bg-aqua' : 'w-1.5 bg-tinta/20 hover:bg-tinta/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Athlete Carousel ──────────────────────────────────────────────────────────

function AthleteCarousel({ rackets }: { rackets: RacketWithInsights[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const syncState = () => {
    const el = trackRef.current
    if (!el) return
    const { scrollLeft, clientWidth, scrollWidth } = el
    setAtStart(scrollLeft <= 2)
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 2)
  }

  useEffect(() => {
    syncState()
    const el = trackRef.current
    if (!el) return
    const ro = new ResizeObserver(syncState)
    ro.observe(el)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const scroll = (dir: 'prev' | 'next') => {
    const el = trackRef.current
    if (!el) return
    // Scroll by ~3 cards (130px card + 12px gap = 142px × 3)
    el.scrollBy({ left: dir === 'next' ? 426 : -426, behavior: 'smooth' })
  }

  const arrowCls = (disabled: boolean) =>
    `hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border shadow-sm items-center justify-center transition-all
     ${disabled ? 'opacity-30 cursor-not-allowed border-gray-200 text-gray-300' : 'border-aqua/30 text-tinta/60 hover:border-aqua/60 hover:text-tinta hover:shadow-md'}`

  return (
    <div className="relative">
      <button
        onClick={() => scroll('prev')}
        disabled={atStart}
        aria-label="Raquetes anteriores"
        className={`${arrowCls(atStart)} left-0 -translate-x-full -ml-2`}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M8.5 2L4 6.5l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="-mx-5 md:mx-0">
        <div
          ref={trackRef}
          onScroll={syncState}
          className="flex gap-3 overflow-x-auto scroll-smooth pl-5 pr-5 md:pl-0 md:pr-0 scroll-pl-5 md:scroll-pl-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {rackets.map(racket => (
            <AthleteRacketCard key={racket.id} racket={racket} />
          ))}
        </div>
      </div>

      <button
        onClick={() => scroll('next')}
        disabled={atEnd}
        aria-label="Próximas raquetes"
        className={`${arrowCls(atEnd)} right-0 translate-x-full ml-2`}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M4.5 2L9 6.5 4.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

// ── Arena decorative ball ──────────────────────────────────────────────────────

function ArenaBall({
  size,
  rotation = 0,
  settled = false,
  className = '',
}: {
  size: number
  rotation?: number
  settled?: boolean
  className?: string
}) {
  const deprW = Math.round(size * 1.7)
  const deprH = Math.round(size * 0.28)
  const burialH = Math.round(size * 0.32)

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute${className ? ' ' + className : ''}`}
      style={{ width: size, height: size }}
    >
      {/* Contact shadow at base */}
      <div
        style={{
          position: 'absolute',
          bottom: -Math.round(deprH * 0.35),
          left: '50%',
          transform: 'translateX(-50%)',
          width: deprW,
          height: deprH,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(120,85,40,0.35) 0%, transparent 70%)',
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/turaquete-bola.svg"
        alt=""
        className={settled ? 'ball-settle' : undefined}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          transform: `rotate(${rotation}deg)`,
          filter: 'drop-shadow(0 2px 5px rgba(100,70,30,0.32))',
          zIndex: 1,
        }}
      />
      {/* Sand burial overlay — bottom of ball fades into arena surface */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: burialH,
          borderRadius: `0 0 ${Math.round(size / 2)}px ${Math.round(size / 2)}px`,
          background: 'linear-gradient(to top, rgba(247,237,220,0.78) 0%, transparent 100%)',
          zIndex: 2,
        }}
      />
    </div>
  )
}

// ── Arena sand mound ──────────────────────────────────────────────────────────

function SandMound({
  width = 100,
  height = 20,
  className = '',
}: {
  width?: number
  height?: number
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute${className ? ' ' + className : ''}`}
    >
      <svg width={width} height={height} viewBox="0 0 100 20" fill="none" preserveAspectRatio="none">
        <ellipse cx="50" cy="18.5" rx="48" ry="3.5" fill="rgba(130,95,50,0.14)" />
        <path d="M3,17 C12,17 22,2 50,1 C78,2 88,17 97,17 Z" fill="rgba(213,190,133,0.56)" />
        <path d="M14,13 C26,7 38,3 50,1.5 C62,3 74,7 86,13 L80,17 L20,17 Z" fill="rgba(188,160,104,0.20)" />
        <path d="M26,10 C35,5 43,3 50,2 C57,3 65,5 74,10" stroke="rgba(235,215,162,0.58)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

// Sky effect — tune this single value to calibrate intensity:
// 0.07 = whisper (barely there), 0.10 = subtle (default), 0.14 = visible but still discreet
const SKY_OP = 0.10
const SKY_RGB = '140, 192, 215'  // desaturated sky blue — doesn't compete with aqua or coral

export default function LandingScreen({ onStart, brands, featuredRackets, featuredSource, athleteRackets, recsCount }: Props) {
  const [showHeaderCta, setShowHeaderCta] = useState(false)
  const heroCtaRef = useRef<HTMLButtonElement>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const [ballSettled, setBallSettled] = useState(false)

  useEffect(() => {
    const el = heroCtaRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowHeaderCta(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = arenaRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setBallSettled(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const handleHeaderCta = () => {
    sendGAEvent({ event: 'chat_iniciado', source: 'header_sticky' })
    onStart()
  }

  return (
    <div className="relative min-h-screen sand-texture flex flex-col items-center pb-10 md:pb-16">

      {/* ── Sky overlay — diffuse cloud suggestions at top of hero, purely decorative ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-x-0 top-0"
        style={{
          height: 'min(520px, 65vh)',
          zIndex: 0,
          background: [
            `radial-gradient(ellipse 120% 55% at 50% -8%, rgba(${SKY_RGB},${SKY_OP}) 0%, transparent 68%)`,
            `radial-gradient(ellipse 58% 32% at 18% 18%, rgba(${SKY_RGB},${SKY_OP * 0.62}) 0%, transparent 75%)`,
            `radial-gradient(ellipse 46% 26% at 80% 22%, rgba(${SKY_RGB},${SKY_OP * 0.52}) 0%, transparent 70%)`,
            `radial-gradient(ellipse 34% 20% at 60%  6%, rgba(${SKY_RGB},${SKY_OP * 0.42}) 0%, transparent 65%)`,
          ].join(', '),
        } as React.CSSProperties}
      />

      {/* Sticky header — full viewport width */}
      <div className={`sticky top-0 z-30 w-full flex justify-center px-5 md:px-8 bg-aqua-light/95 backdrop-blur-sm transition-shadow duration-200${showHeaderCta ? ' shadow-sm' : ''}`}>
        <div className="w-full max-w-sm md:max-w-2xl flex items-center justify-between py-3 md:py-4">
          <Link href="/" aria-label="Voltar à página inicial" className="cursor-pointer">
            <Image
              src="/logo-header.png"
              alt="Turaquete"
              width={322}
              height={128}
              priority
              className="h-10 md:h-[3.25rem] w-auto"
              style={{ width: 'auto' }}
            />
          </Link>
          <button
            onClick={handleHeaderCta}
            aria-hidden={!showHeaderCta}
            tabIndex={showHeaderCta ? 0 : -1}
            className={`font-heading font-bold bg-coral text-white text-sm px-4 py-2 rounded-full shadow-sm transition-all duration-200 ${
              showHeaderCta
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-1 pointer-events-none'
            }`}
          >
            Começar
          </button>
        </div>
      </div>

      {/* ── Seção menta: hero ── */}
      <div className="w-full max-w-sm md:max-w-5xl px-5 md:px-8 pb-2 md:pb-3">
        <div className="flex flex-col md:grid md:grid-cols-[1fr_380px] md:gap-6 md:items-center gap-5">

          {/* Coluna texto */}
          <div className="flex flex-col gap-5 md:gap-5">

            {/* H1 + subtítulo */}
            <div className="flex flex-col gap-3">
              <h1 className="font-heading font-extrabold text-tinta text-[2.5rem] md:text-[3rem] leading-[1.1] tracking-tight">
                A raquete certa{' '}
                <span className="relative inline-block text-coral">
                  de primeira.
                  <svg
                    viewBox="0 0 140 10"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 w-full h-[8px]"
                  >
                    <path
                      d="M3 6.5C30 2 65 1.5 100 3.5C118 5 132 6.2 137 7"
                      stroke="#FF5E3A"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </span>
              </h1>
              <p className="text-tinta/70 text-base md:text-lg leading-relaxed">
                Raquete errada custa caro. Conte como você joga e nosso especialista te indica a ideal pro seu nível, estilo e bolso, explicando o porquê de cada escolha.
              </p>
            </div>

            {/* Franja */}
            <div className="bg-coral/10 border-l-[5px] border-coral rounded-r-xl px-4 py-3.5 md:px-5 md:py-4">
              <p className="text-tinta font-semibold text-sm md:text-base leading-relaxed">
                O mesmo que um especialista cobra pra fazer numa consultoria. Aqui, de graça.
              </p>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              {BADGES.map(badge => (
                <span
                  key={badge}
                  className="bg-aqua/15 text-tinta text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-coral shrink-0" aria-hidden="true" />
                  {badge}
                </span>
              ))}
            </div>

            {/* CTA hero — IntersectionObserver target */}
            <div className="flex items-end gap-2 md:gap-3">
              {/* Tury: alinhada pela base com o botão, levemente acima por marginBottom */}
              <Image
                src="/tury-explicando.png"
                alt="Tury apontando para o botão Começar agora"
                width={296}
                height={376}
                priority
                className="max-[359px]:hidden shrink-0 select-none pointer-events-none"
                style={{ height: '72px', width: 'auto', marginBottom: '-4px' }}
              />
              <button
                ref={heroCtaRef}
                onClick={onStart}
                className="flex-1 font-heading font-bold bg-coral text-white text-lg md:text-xl py-4 md:py-5 rounded-2xl hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] transition-all shadow-md"
              >
                Começar agora
              </button>
            </div>

            {/* A — Contador vivo / trust signal */}
            {recsCount >= RECS_THRESHOLD ? (
              <p className="text-tinta/50 text-xs">
                Já ajudei{' '}
                <strong className="text-tinta/70">{recsCount.toLocaleString('pt-BR')}</strong>{' '}
                jogadores a encontrar a raquete certa
              </p>
            ) : (
              <p className="text-tinta/50 text-xs">
                Consultoria instantânea pra jogadores de todo o Brasil
              </p>
            )}

          </div>{/* end coluna texto */}

          {/* Coluna visual — foto hero */}
          <div className="relative w-full h-[200px] md:h-auto md:aspect-[1/1] rounded-2xl overflow-hidden shrink-0">
            <Image
              src="/hero-beach-tennis.jpg"
              alt="Raquetes de beach tennis na areia"
              fill
              className="object-cover object-center"
              priority
              sizes="(max-width: 768px) 100vw, 380px"
            />
            {/* Gradiente que funde a borda esquerda da foto com o fundo do hero (apenas desktop) */}
            <div
              className="absolute inset-0 hidden md:block pointer-events-none"
              aria-hidden="true"
              style={{ background: 'linear-gradient(to right, #EAF7F6 0%, rgba(234,247,246,0.45) 22%, transparent 52%)' }}
            />
          </div>

        </div>
      </div>{/* end seção menta */}

      {/* ── Onda de entrada: menta → arena ── */}
      <svg
        viewBox="0 0 1440 50"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="w-full h-12 md:h-14 block"
      >
        <path d="M0,32 C480,16 960,42 1440,24 L1440,50 L0,50 Z" fill="#F7EDDC" />
      </svg>

      {/* ── Seção arena: chat preview + conteúdo sobre areia ── */}
      <div ref={arenaRef} className="w-full bg-arena arena-grain relative">
        {/* ── Pelotas decorativas ── */}
        {/* Bola A: 36px, rotation 0°, desktop-only, gutter esquerdo */}
        <ArenaBall size={36} rotation={0} className="hidden md:block left-[2.5%] bottom-10" />

        {/* Bola B: 22px, rotation 40°, mobile topo-esquerdo / desktop gutter direito */}
        <ArenaBall size={22} rotation={40} className="top-[7px] left-4 md:top-9 md:left-auto md:right-[2%]" />

        {/* Bola C: 28px, rotation -25°, animada (1x), rodapé — mobile + desktop */}
        <ArenaBall size={28} rotation={-25} settled={ballSettled} className="bottom-[6px] right-5 md:bottom-8 md:right-[3%]" />

        {/* ── Montes de areia decorativos ── */}
        {/* 1: rodapé centro — visível em todos */}
        <SandMound width={115} height={22} className="bottom-3 left-1/2 -translate-x-1/2" />
        {/* 2: topo esquerdo — padding superior, não cobre card */}
        <SandMound width={78} height={16} className="top-2 left-[8%]" />
        {/* 3: gutter esquerdo meio — desktop only */}
        <SandMound width={98} height={20} className="hidden md:block top-[42%] left-[1.5%]" />
        {/* 4: gutter direito topo — desktop only */}
        <SandMound width={82} height={17} className="hidden md:block top-[18%] right-[1.5%]" />

        <div className="max-w-sm md:max-w-2xl mx-auto px-5 md:px-8 py-7 md:py-9 flex flex-col gap-5 md:gap-7">

          {/* Como funciona */}
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-arena border border-aqua/20">
            <p className="font-heading font-bold text-tinta text-base md:text-lg mb-5">Como funciona</p>
            <div className="flex flex-col">
              {STEPS.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center w-8 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-aqua text-white text-xs font-heading font-bold flex items-center justify-center shrink-0 shadow-sm">
                      {i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-px flex-1 min-h-4 bg-aqua/35" />
                    )}
                  </div>
                  <div className={`flex flex-col pt-1${i < STEPS.length - 1 ? ' pb-5' : ''}`}>
                    <p className="text-tinta text-sm md:text-base leading-relaxed">{step.label}</p>
                    {step.desc && (
                      <p className="text-tinta/60 text-xs md:text-sm leading-relaxed mt-1">{step.desc}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* C — Comparador como diferenciador */}
            <button
              onClick={onStart}
              className="mt-5 pt-4 border-t border-aqua/15 w-full flex items-center justify-between group hover:bg-aqua/5 rounded-xl px-1 py-1 -mx-1 -mb-1 transition-colors"
            >
              <span className="text-tinta/65 text-sm leading-snug text-left">
                Compare qualquer raquete do catálogo lado a lado, na hora
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 ml-3 text-aqua/50 group-hover:text-aqua transition-colors" aria-hidden="true">
                <path d="M3.5 8h9M9 4.5L12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Analisamos seu jogo — card escuro, diferenciador */}
          <div className="bg-tinta rounded-2xl p-5 md:p-6 shadow-md">
            <p className="font-heading font-bold text-white text-base md:text-lg mb-4">Analisamos seu jogo</p>
            <div className="grid grid-cols-2 gap-2.5">
              {ANALYSIS_ITEMS.map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-3">
                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                    <Icon />
                  </div>
                  <span className="text-white/90 text-sm font-medium leading-snug">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* B — Perguntas reais anonimizadas */}
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-arena border border-aqua/20">
            <p className="font-heading font-bold text-tinta text-base md:text-lg mb-1">Dúvidas que o especialista já respondeu</p>
            <p className="text-tinta/50 text-xs mb-4">perguntas reais de jogadores, sem edição</p>
            <div className="flex flex-col gap-2">
              {CURATED_QUESTIONS.map((q, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-aqua/15 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M6 1C3.24 1 1 3.02 1 5.5c0 .98.32 1.89.86 2.63L1.5 11l2.93-1.5C4.9 9.82 5.44 10 6 10c2.76 0 5-2.02 5-4.5S8.76 1 6 1z" fill="#0CC0BE" opacity=".7"/>
                    </svg>
                  </div>
                  <p className="text-tinta/75 text-sm leading-relaxed italic">&ldquo;{q}&rdquo;</p>
                </div>
              ))}
            </div>
            <button
              onClick={onStart}
              className="mt-5 w-full text-center text-sm font-semibold text-aqua hover:text-tinta/70 transition-colors"
            >
              Contar minha situação →
            </button>
          </div>

          {/* Raquetes em destaque / mais recomendadas */}
          {featuredRackets.length > 0 && (
            <div className="flex flex-col gap-3">
              {featuredSource === 'real' ? (
                <div className="flex flex-col gap-0.5">
                  <p className="font-heading font-bold text-tinta text-base md:text-lg">
                    As mais recomendadas pelo especialista
                  </p>
                  <p className="text-tinta/50 text-xs">com base nas consultorias recentes</p>
                </div>
              ) : (
                <p className="font-heading font-bold text-tinta text-base md:text-lg">Raquetes em destaque</p>
              )}
              <FeaturedCarousel rackets={featuredRackets} />
            </div>
          )}

        </div>
      </div>{/* end seção arena */}

      {/* ── Onda de saída: arena → menta ── */}
      <div className="w-full bg-arena" aria-hidden="true">
        <svg
          viewBox="0 0 1440 50"
          preserveAspectRatio="none"
          className="w-full h-12 md:h-14 block"
        >
          <path d="M0,22 C480,40 960,14 1440,32 L1440,50 L0,50 Z" fill="#EAF7F6" />
        </svg>
      </div>

      {/* ── Seção menta: marcas + FAQ + CTA + footer ── */}
      <div className="w-full max-w-sm md:max-w-2xl flex flex-col gap-5 md:gap-7 px-5 md:px-8 pt-3 md:pt-4">

        {/* Marcas disponíveis */}
        {brands.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="font-heading font-bold text-tinta text-base md:text-lg">Marcas disponíveis</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {brands.map(brand => (
                <BrandCard key={brand.id} brand={brand} />
              ))}
            </div>
          </div>
        )}

        {/* Raquetes dos atletas */}
        {athleteRackets.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="font-heading font-bold text-tinta text-base md:text-lg">As raquetes dos atletas que jogam de verdade</p>
              <p className="text-tinta/50 text-xs">modelos assinados por atletas do circuito</p>
            </div>
            <AthleteCarousel rackets={athleteRackets} />
          </div>
        )}

        {/* Perguntas frequentes */}
        <div className="flex flex-col gap-3">
          <p className="font-heading font-bold text-tinta text-base md:text-lg">Perguntas frequentes</p>
          <div className="bg-white rounded-2xl border border-aqua/20 shadow-sm overflow-hidden divide-y divide-aqua/10">
            {FAQS.map(({ q, a }, i) => (
              <details key={i} className="group" open={i === 0}>
                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-tinta font-heading font-semibold text-sm md:text-base [list-style:none] select-none [&::-webkit-details-marker]:hidden">
                  {q}
                  <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    className="shrink-0 ml-3 text-aqua transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  >
                    <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <p className="px-5 pb-4 text-tinta/70 text-sm md:text-base leading-relaxed">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA principal */}
        <button
          onClick={onStart}
          className="w-full font-heading font-bold bg-coral text-white text-lg md:text-xl py-4 md:py-5 rounded-2xl hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] transition-all shadow-md"
        >
          Começar agora
        </button>

        {/* Linha de confiança */}
        <p className="text-center text-tinta/50 text-xs md:text-sm leading-relaxed">
          Recomendações baseadas nas especificações reais de cada raquete. Sem achismo.
        </p>

        {/* Footer */}
        <footer className="pt-3 pb-2 flex flex-col items-center gap-3 border-t border-tinta/10">
          <p className="text-center text-tinta/40 text-xs leading-relaxed max-w-xs">
            A Turaquete pode receber comissão por compras feitas pelos links indicados, sem custo extra pra você.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/5547997649011?text=Oi!%20Vim%20pelo%20Turaquete%20e%20queria%20tirar%20uma%20d%C3%BAvida."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-tinta/40 text-xs hover:text-tinta/70 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <span className="text-tinta/20 text-xs">·</span>
            <a
              href="mailto:contato@turaquete.com.br"
              className="text-tinta/40 text-xs hover:text-tinta/70 transition-colors"
            >
              E-mail
            </a>
            <span className="text-tinta/20 text-xs">·</span>
            <Link
              href="/privacidade"
              className="text-tinta/40 text-xs hover:text-tinta/70 transition-colors"
            >
              Privacidade
            </Link>
            <span className="text-tinta/20 text-xs">·</span>
            <Link
              href="/termos"
              className="text-tinta/40 text-xs hover:text-tinta/70 transition-colors"
            >
              Termos de Uso
            </Link>
          </div>
        </footer>

      </div>{/* end seção 3 */}

    </div>
  )
}
