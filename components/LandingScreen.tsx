'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { sendGAEvent } from '@next/third-parties/google'
import { Brand, RacketWithInsights } from '@/lib/recommend'

interface Props {
  onStart: () => void
  brands: Brand[]
  featuredRackets: RacketWithInsights[]
  previewRacket?: RacketWithInsights
}

const BADGES = ['Grátis', '1 minuto', 'Sem cadastro']

const STEPS = [
  'Conte como você joga, do seu jeito',
  'O especialista entende seu perfil',
  'Receba 2-3 raquetes com o porquê e o link',
]

const FAQS = [
  {
    q: 'É grátis mesmo?',
    a: 'Sim. Você conta como joga e recebe as recomendações na hora. Sem cadastro, sem plano, sem custo de nenhum tipo.',
  },
  {
    q: 'Como vocês escolhem as raquetes?',
    a: 'Com base em specs reais e análise especializada — peso, balance, material do núcleo e da face. Sem achismo, sem patrocínio.',
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
      <path d="M8.5 12l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconOrcamento() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#0CC0BE" />
      <path d="M12 7.5v9" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M9.5 10h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 14h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
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

function ChatPreview({ racket }: { racket?: RacketWithInsights }) {
  const previewPrice = racket?.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : 'R$ 2.299'
  const previewImage = racket?.image_url ?? null

  return (
    <div className="w-[220px] md:w-[240px] flex-shrink-0 select-none pointer-events-none">
      <div className="bg-gray-50 rounded-2xl border border-aqua/20 shadow-xl p-3 flex flex-col gap-2 rotate-[2deg]">

        {/* Header simulado */}
        <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-gray-100 shadow-sm">
          <div className="w-5 h-5 rounded-full overflow-hidden bg-tinta shrink-0">
            <Image src="/turaquete-favicon.png" alt="" width={20} height={20} className="w-full h-full object-cover" />
          </div>
          <span className="font-heading text-tinta text-[10px] font-semibold leading-none">especialista em raquetes</span>
        </div>

        {/* Burbuja usuário */}
        <div className="flex justify-end">
          <div className="bg-tinta rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
            <p className="text-white text-[11px] leading-snug">Sinto o cotovelo e jogo mais na defesa</p>
          </div>
        </div>

        {/* Burbuja agente */}
        <div className="flex items-end gap-1.5">
          <div className="w-5 h-5 rounded-full overflow-hidden bg-tinta shrink-0">
            <Image src="/turaquete-favicon.png" alt="" width={20} height={20} className="w-full h-full object-cover" />
          </div>
          <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 border border-gray-100 shadow-sm flex-1">
            <p className="text-tinta text-[11px] leading-snug">Achei a ideal pra proteger seu braço:</p>
          </div>
        </div>

        {/* Mini RacketCard — CÉU */}
        <div className="bg-white rounded-xl border border-aqua/20 overflow-hidden flex flex-col shadow-sm ml-[26px]">
          <div className="h-16 bg-white flex items-center justify-center p-1.5">
            {previewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewImage} alt="" className="h-full w-full object-contain" />
            ) : (
              <IconEstilo />
            )}
          </div>
          <div className="px-2.5 py-2 flex flex-col gap-1">
            <p className="font-heading text-tinta text-[10px] font-semibold leading-tight">CÉU</p>
            <p className="font-heading text-coral text-[11px] font-bold">{previewPrice}</p>
            <p className="text-tinta/50 text-[9px] leading-snug">EVA supersoft + 22mm: conforto e estabilidade na defesa</p>
            <div className="border border-aqua rounded-lg py-1 text-center mt-0.5">
              <p className="text-tinta text-[9px] font-semibold">Quero esta raquete</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function BrandCard({ brand }: { brand: Brand }) {
  const isAvailable = brand.status === 'disponivel'

  const inner = (
    <>
      <span className={`text-sm font-medium ${isAvailable ? 'text-tinta' : 'text-tinta/50'}`}>
        {brand.name}
      </span>
      <div className="flex items-center gap-2">
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

function FeaturedCard({ racket, onStart }: { racket: RacketWithInsights; onStart: () => void }) {
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null

  const perfil = racket.racket_insights?.perfil_resumo ?? null

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-aqua/20 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <Link href={`/raquetes/${racket.slug}`} className="block">
        <div className="aspect-[4/5] bg-white p-3 flex items-center justify-center">
          {racket.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={racket.image_url} alt={racket.name} className="w-full h-full object-contain" />
          ) : (
            <IconEstilo />
          )}
        </div>
      </Link>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <Link href={`/raquetes/${racket.slug}`}>
          <p className="font-heading text-tinta text-xs font-semibold leading-snug line-clamp-2 hover:text-aqua transition-colors">
            {racket.name}
          </p>
        </Link>
        {perfil && (
          <p className="text-tinta/55 text-[10px] leading-snug line-clamp-2">{perfil}</p>
        )}
        {price && <p className="font-heading text-coral font-bold text-sm">{price}</p>}
        <button
          onClick={onStart}
          className="mt-auto w-full border border-aqua text-tinta text-xs font-semibold py-2 rounded-xl hover:bg-aqua/10 active:bg-aqua/20 active:scale-[0.98] transition-all leading-tight"
        >
          Quero esta raquete
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LandingScreen({ onStart, brands, featuredRackets, previewRacket }: Props) {
  const [showHeaderCta, setShowHeaderCta] = useState(false)
  const heroCtaRef = useRef<HTMLButtonElement>(null)

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

  const handleHeaderCta = () => {
    sendGAEvent({ event: 'chat_iniciado', source: 'header_sticky' })
    onStart()
  }

  return (
    <div className="min-h-screen bg-aqua-light flex flex-col items-center pb-10 md:pb-16">

      {/* Sticky header — full viewport width */}
      <div className={`sticky top-0 z-10 w-full flex justify-center px-5 md:px-8 bg-aqua-light/95 backdrop-blur-sm transition-shadow duration-200${showHeaderCta ? ' shadow-sm' : ''}`}>
        <div className="w-full max-w-sm md:max-w-2xl flex items-center justify-between py-3 md:py-4">
          <Image
            src="/turaquete-logo.png"
            alt="Turaquete"
            width={852}
            height={474}
            priority
            className="h-10 md:h-[3.25rem] w-auto"
          />
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

      {/* ── Seção menta: hero (texto apenas) ── */}
      <div className="w-full max-w-sm md:max-w-2xl px-5 md:px-8 pb-2 md:pb-3">
        <div className="flex flex-col gap-5 md:gap-7">

          {/* H1 + subtítulo */}
          <div className="flex flex-col gap-3 md:gap-4">
            <h1 className="font-heading font-extrabold text-tinta text-[2.5rem] md:text-[3.75rem] leading-[1.1] tracking-tight">
              Uma consultoria de especialista.{' '}
              <span className="relative inline-block text-coral">
                De graça.
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
              Conte como você joga e receba a raquete ideal em 1 minuto, analisando seu nível, estilo, dores no braço e orçamento.
            </p>
          </div>

          {/* Franja */}
          <div className="bg-aqua/15 border-l-4 border-coral rounded-r-xl px-4 py-3 md:px-5 md:py-4">
            <p className="text-tinta font-medium text-sm md:text-base leading-relaxed">
              O mesmo que um especialista faz numa consultoria paga — aqui sem custo.
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
          <button
            ref={heroCtaRef}
            onClick={onStart}
            className="w-full font-heading font-bold bg-coral text-white text-lg md:text-xl py-4 md:py-5 rounded-2xl hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] transition-all shadow-md"
          >
            Começar agora
          </button>

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
      <div className="w-full bg-arena arena-grain">
        <div className="max-w-sm md:max-w-2xl mx-auto px-5 md:px-8 py-7 md:py-9 flex flex-col gap-5 md:gap-7">

          {/* Chat preview (mobile: acima, desktop: direita) + Como funciona */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] md:gap-10 md:items-start gap-5">

            {/* Como funciona */}
            <div className="order-2 md:order-1 bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-aqua/20 hover:shadow-md transition-shadow">
              <p className="font-heading font-bold text-tinta text-base md:text-lg mb-5">Como funciona</p>
              <div className="flex flex-col">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center w-7 shrink-0">
                      <div className="w-7 h-7 rounded-full bg-aqua text-white text-xs font-heading font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="w-px flex-1 min-h-4 bg-aqua/25" />
                      )}
                    </div>
                    <p className={`text-tinta text-sm md:text-base leading-relaxed pt-0.5${i < STEPS.length - 1 ? ' pb-6' : ''}`}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview do chat — flutua sobre a areia */}
            <div className="order-1 md:order-2 flex justify-center md:justify-end" aria-hidden="true">
              <ChatPreview racket={previewRacket} />
            </div>

          </div>{/* end grid chat+como-funciona */}

          {/* Analisamos seu jogo */}
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-aqua/20 hover:shadow-md transition-shadow">
            <p className="font-heading font-bold text-tinta text-base md:text-lg mb-4">Analisamos seu jogo</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ANALYSIS_ITEMS.map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon />
                  <span className="text-tinta text-sm md:text-base">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Raquetes em destaque */}
          {featuredRackets.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="font-heading font-bold text-tinta text-base md:text-lg">Raquetes em destaque</p>
              <div className="grid grid-cols-3 gap-3">
                {featuredRackets.map(racket => (
                  <FeaturedCard key={racket.id} racket={racket} onStart={onStart} />
                ))}
              </div>
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
          Recomendações baseadas em specs reais e análise especializada. Sem achismo.
        </p>

        {/* Footer */}
        <footer className="pt-3 pb-2 flex flex-col items-center gap-3 border-t border-tinta/10">
          <p className="text-center text-tinta/40 text-xs leading-relaxed max-w-xs">
            A Turaquete pode receber comissão por compras feitas pelos links indicados, sem custo extra pra você.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="mailto:contato@turaquete.com.br"
              className="text-tinta/40 text-xs hover:text-tinta/70 transition-colors"
            >
              Contato
            </a>
            <span className="text-tinta/20 text-xs">·</span>
            <Link
              href="/privacidade"
              className="text-tinta/40 text-xs hover:text-tinta/70 transition-colors"
            >
              Privacidade
            </Link>
          </div>
        </footer>

      </div>{/* end seção 3 */}

    </div>
  )
}
