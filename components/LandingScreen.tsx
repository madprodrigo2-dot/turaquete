import Image from 'next/image'
import Link from 'next/link'
import { Brand, RacketWithInsights } from '@/lib/recommend'

interface Props {
  onStart: () => void
  brands: Brand[]
  featuredRackets: RacketWithInsights[]
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

function FeaturedCard({ racket, onStart }: { racket: RacketWithInsights; onStart: () => void }) {
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-aqua/20 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <Link href={`/raquetes/${racket.slug}`} className="block">
        {racket.image_url ? (
          <div className="aspect-square bg-gray-50 p-2 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={racket.image_url} alt={racket.name} className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="aspect-square bg-aqua-light flex items-center justify-center">
            <IconEstilo />
          </div>
        )}
      </Link>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <Link href={`/raquetes/${racket.slug}`}>
          <p className="font-heading text-tinta text-xs font-semibold leading-snug line-clamp-2 hover:text-aqua transition-colors">
            {racket.name}
          </p>
        </Link>
        {price && <p className="font-heading text-coral font-bold text-sm">{price}</p>}
        <button
          onClick={onStart}
          className="mt-auto w-full border border-aqua/40 text-aqua text-xs font-semibold py-2 rounded-xl hover:bg-aqua/10 active:scale-[0.98] transition-all leading-tight"
        >
          Quero esta raquete
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LandingScreen({ onStart, brands, featuredRackets }: Props) {
  return (
    <div className="min-h-screen bg-aqua-light flex flex-col items-center px-5 md:px-8 py-10 md:py-16">
      <div className="w-full max-w-sm md:max-w-xl flex flex-col gap-7 md:gap-9">

        {/* Logo */}
        <div className="flex justify-center pt-2">
          <Image
            src="/turaquete-logo.png"
            alt="Turaquete"
            width={852}
            height={474}
            priority
            className="h-20 md:h-28 w-auto"
          />
        </div>

        {/* H1 + subtítulo */}
        <div className="flex flex-col gap-3 md:gap-4">
          <h1 className="font-heading font-extrabold text-tinta text-[2.5rem] md:text-[3.75rem] leading-[1.1] tracking-tight">
            Uma consultoria de especialista.{' '}
            <span className="relative inline-block text-coral">
              De graça.
              {/* Swoosh decorativo coral */}
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

        {/* Badges — bg suave + ponto coral */}
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

        {/* Como funciona */}
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-aqua/20 hover:shadow-md transition-shadow">
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

        {/* Marcas disponíveis */}
        {brands.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="font-heading font-bold text-tinta text-base md:text-lg">Marcas disponíveis</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {brands.map(brand => (
                <div
                  key={brand.id}
                  className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-aqua/20 shadow-sm hover:shadow-md transition-shadow"
                >
                  {brand.status === 'disponivel' ? (
                    <Link href={`/marcas/${brand.slug}`} className="text-tinta text-sm font-medium hover:text-aqua transition-colors">
                      {brand.name}
                    </Link>
                  ) : (
                    <span className="text-tinta text-sm font-medium">{brand.name}</span>
                  )}
                  <StatusIndicator status={brand.status} />
                </div>
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
          <a
            href="mailto:contato@turaquete.com.br"
            className="text-tinta/40 text-xs hover:text-tinta/70 transition-colors"
          >
            Contato
          </a>
        </footer>

      </div>
    </div>
  )
}
