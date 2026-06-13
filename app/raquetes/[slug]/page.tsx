import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getRaquetaPorSlug, listarRaquetas } from '@/lib/recommend'
import BuyButton from '@/components/BuyButton'
import AthleteBadge from '@/components/AthleteBadge'
import SpecsGrid, { NIVEL_LABEL } from '@/components/SpecsGrid'
import ScoreSection from '@/components/ScoreSection'
import RacketKeyStats from '@/components/RacketKeyStats'

export const dynamicParams = false

export async function generateStaticParams() {
  const rackets = await listarRaquetas().catch(() => [])
  return rackets.map(r => ({ slug: r.slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const racket = await getRaquetaPorSlug(slug)
  if (!racket) return {}

  const ins = racket.racket_insights
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null

  const title = `${racket.name} — Raquete de Beach Tennis | Turaquete`
  const description =
    ins?.perfil_resumo ??
    `Specs, avaliação e onde comprar a ${racket.name}.${price ? ` A partir de ${price}.` : ''}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(racket.image_url && { images: [racket.image_url] }),
      locale: 'pt_BR',
      type: 'website',
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RaquetaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const racket = await getRaquetaPorSlug(slug)
  if (!racket) notFound()

  const ins = racket.racket_insights
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null
  const buyUrl   = racket.affiliate_url ?? racket.source_url
  const irUrl    = buyUrl ? `/ir/${racket.slug}` : null
  const linkTipo: 'afiliado' | 'oficial' = racket.affiliate_url ? 'afiliado' : 'oficial'

  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: racket.name,
    ...(ins?.perfil_resumo && { description: ins.perfil_resumo }),
    ...(racket.image_url && { image: racket.image_url }),
    brand: { '@type': 'Brand', name: "Heroe's" },
    ...(racket.price && buyUrl && {
      offers: {
        '@type': 'Offer',
        price: racket.price,
        priceCurrency: racket.currency ?? 'BRL',
        url: buyUrl,
        availability: 'https://schema.org/InStock',
      },
    }),
  }

  const extra = (racket.specs_extra as Record<string, unknown> | null) ?? {}
  const athlete = extra.atleta as string | undefined
  const tratamentoFabrica = extra.tratamento_fabrica as boolean | undefined

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(product) }}
      />

      <div className="min-h-screen bg-aqua-light">
        {/* Nav */}
        <div className="sticky top-0 z-30 bg-aqua-light/90 backdrop-blur-sm border-b border-aqua/20 px-5 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-tinta text-sm font-medium hover:text-aqua transition-colors w-fit"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Voltar
          </Link>
        </div>

        <div className="max-w-xl mx-auto px-5 py-8 flex flex-col gap-6">

          {/* Imagem */}
          {racket.image_url && (
            <div className="bg-white rounded-2xl p-6 flex items-center justify-center border border-aqua/20 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={racket.image_url}
                alt={racket.name}
                className="object-contain max-h-64 w-auto"
              />
            </div>
          )}

          {/* Título + preço + badges */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-tinta leading-tight">{racket.name}</h1>
            {price && <p className="text-coral text-xl font-bold">{price}</p>}
            <div className="flex gap-2 flex-wrap">
              {athlete && <AthleteBadge athlete={athlete} />}
              {ins?.nivel_sugerido && (
                <span className="bg-aqua/15 text-aqua text-xs font-semibold px-3 py-1 rounded-full">
                  {NIVEL_LABEL[ins.nivel_sugerido] ?? ins.nivel_sugerido}
                </span>
              )}
              {ins?.elbow_friendly && (
                <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                  Cotovelo amigável
                </span>
              )}
              {ins?.shoulder_friendly && (
                <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                  Ombro amigável
                </span>
              )}
            </div>
          </div>

          {/* Perfil resumo */}
          {ins?.perfil_resumo && (
            <div className="bg-white rounded-2xl p-5 border border-aqua/20 shadow-sm">
              <p className="text-tinta leading-relaxed text-sm md:text-base">{ins.perfil_resumo}</p>
            </div>
          )}

          {/* Pontuações */}
          {ins && (ins.power !== null || ins.control !== null) && (
            <div className="bg-white rounded-2xl p-5 border border-aqua/20 shadow-sm flex flex-col gap-4">
              <p className="text-tinta font-semibold text-sm md:text-base">Avaliação</p>
              <ScoreSection
                power={ins.power}
                control={ins.control}
                comfort={ins.comfort}
                maneuverability={ins.maneuverability}
                spin={ins.spin}
                stability={ins.stability}
                tratamentoFabrica={tratamentoFabrica}
              />
              <RacketKeyStats racket={racket} />
              {/* Shown only for baixa/media — used when a new racket enters with incomplete
                  or conflicting specs, until data is filled in. alta = hide silently. */}
              {ins.confianca && ins.confianca !== 'alta' && (
                <p className="text-tinta/40 text-xs">
                  Confiança da avaliação: {ins.confianca}
                </p>
              )}
            </div>
          )}

          {/* Specs */}
          <div className="bg-white rounded-2xl p-5 border border-aqua/20 shadow-sm">
            <p className="text-tinta font-semibold text-sm md:text-base mb-3">Especificações</p>
            <SpecsGrid racket={racket} />
          </div>

          {/* CTA compra */}
          {irUrl ? (
            <BuyButton
              href={irUrl}
              racketName={racket.name}
              racketSlug={racket.slug}
              linkTipo={linkTipo}
              className="w-full bg-coral text-white font-semibold text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md text-center block"
            >
              {price ? `Comprar por ${price}` : 'Ver onde comprar'}
            </BuyButton>
          ) : (
            <Link
              href="/"
              className="w-full bg-aqua text-white font-semibold text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md text-center block"
            >
              Falar com o especialista
            </Link>
          )}

          {/* Falar com especialista (secundário, sempre presente) */}
          {irUrl && (
            <Link
              href="/"
              className="w-full border border-aqua/40 text-aqua font-semibold text-sm py-3 rounded-2xl hover:bg-aqua/10 active:scale-[0.98] transition-all text-center block"
            >
              Não tem certeza? Fale com o especialista
            </Link>
          )}

          <p className="text-center text-tinta/40 text-xs leading-relaxed">
            A Turaquete pode receber comissão por compras feitas pelos links indicados, sem custo extra pra você.
          </p>

        </div>
      </div>
    </>
  )
}
