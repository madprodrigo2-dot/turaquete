export const revalidate = 300

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getRaquetaPorSlug, listarRaquetas } from '@/lib/recommend'
import { getDisplayName } from '@/lib/displayName'
import { SEARCH_FALLBACK_UNCOVERED } from '@/lib/ml-search'
import { SITE_URL } from '@/lib/site'
import BuyButton from '@/components/BuyButton'
import SiteNav from '@/components/SiteNav'
import RacketBadgeOverlay from '@/components/RacketBadgeOverlay'
import SpecsGrid, { NIVEL_LABEL } from '@/components/SpecsGrid'
import ScoreSection from '@/components/ScoreSection'
import RacketKeyStats from '@/components/RacketKeyStats'
import RacketHexagon from '@/components/RacketHexagon'
import { derivarNivel } from '@/lib/nivel'
import PriceNote from '@/components/PriceNote'
import ShareButton from '@/components/ShareButton'
import MegaSpinLink from '@/components/MegaSpinLink'

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

  const displayName = getDisplayName(racket)
  const title = `${displayName} — Raquete de Beach Tennis | Turaquete`
  const description =
    ins?.perfil_resumo ??
    `Especificações reais, avaliação e onde comprar a ${displayName}.${price ? ` A partir de ${price}.` : ''}`

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.turaquete.com.br/raquetes/${slug}`,
    },
    openGraph: {
      title,
      description,
      ...(racket.image_url && {
        images: [racket.image_url.startsWith('http') ? racket.image_url : `${SITE_URL}${racket.image_url}`],
      }),
      locale: 'pt_BR',
      type: 'website',
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RaquetaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [racket, allRackets] = await Promise.all([
    getRaquetaPorSlug(slug),
    listarRaquetas().catch(() => []),
  ])
  if (!racket) notFound()

  const sugestoes = allRackets
    .filter(r => r.slug !== racket.slug)
    .map(r => ({
      r,
      score:
        (r.nome_base && r.nome_base === racket.nome_base && r.brands?.name === racket.brands?.name ? 20 : 0) +
        (r.brands?.name === racket.brands?.name ? 10 : 0) +
        (racket.price && r.price
          ? Math.abs(r.price - racket.price) / racket.price < 0.3 ? 5 : 0
          : 0),
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(x => x.r)

  const ins = racket.racket_insights
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null
  const buyUrl   = racket.affiliate_url ?? racket.source_url
  const hasLink  = !!(buyUrl || SEARCH_FALLBACK_UNCOVERED)
  const irUrl    = hasLink ? `/ir/${racket.slug}` : null
  const linkTipo: 'afiliado' | 'oficial' = racket.affiliate_url ? 'afiliado' : 'oficial'

  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: getDisplayName(racket),
    ...(ins?.perfil_resumo && { description: ins.perfil_resumo }),
    ...(racket.image_url && {
      image: racket.image_url.startsWith('http') ? racket.image_url : `${SITE_URL}${racket.image_url}`,
    }),
    ...(racket.brands?.name && { brand: { '@type': 'Brand', name: racket.brands.name } }),
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
  const tecnologias = (Array.isArray(extra.tecnologias)
    ? (extra.tecnologias as { nome: string; tipo: string }[])
    : []
  ).filter(t => !['material', 'núcleo', 'nucleo'].includes(t.tipo))
  const athleteRaw = extra.atleta
  const athlete: string | undefined = Array.isArray(athleteRaw)
    ? (athleteRaw as string[]).filter(Boolean).join(' & ') || undefined
    : typeof athleteRaw === 'string' ? athleteRaw : undefined
  const tratamentoFabrica = extra.tratamento_fabrica as boolean | undefined

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(product) }}
      />

      <div className="min-h-screen sand-texture">
        <SiteNav
          useHistory
          fallbackHref={racket.brands?.slug ? `/marcas/${racket.brands.slug}` : '/'}
          maxWidth="max-w-5xl"
        />

        <div className="max-w-5xl mx-auto px-5 md:px-10 py-8">

          {/* Layout: coluna única mobile, 2 colunas desktop (imagem sticky + conteúdo) */}
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_1.15fr] lg:gap-10 lg:items-start">

            {/* ── Coluna esquerda: imagem sticky ── */}
            <div className="lg:sticky lg:top-20">
              <div className="bg-white rounded-2xl p-6 flex items-center justify-center shadow-card border border-[rgba(14,58,64,0.06)] min-h-[220px]">
                {racket.image_url ? (
                  <div className="relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={racket.image_url}
                      alt={racket.name}
                      className="object-contain max-h-72 lg:max-h-[520px] w-auto"
                    />
                    <RacketBadgeOverlay athlete={athlete} brandLogo={racket.brands?.logo_url} brandName={racket.brands?.name} size="detail" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-aqua/30">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <ellipse cx="12" cy="9.5" rx="6" ry="7.5" fill="currentColor" />
                      <rect x="10.5" y="16" width="3" height="7" rx="1.5" fill="currentColor" />
                    </svg>
                    <span className="text-xs text-tinta/30">{getDisplayName(racket)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Coluna direita: todo o conteúdo ── */}
            <div className="flex flex-col gap-5">

              {/* Título + preço + badges */}
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-tinta leading-tight">{getDisplayName(racket)}</h1>
                {price && (
                  <div>
                    <p className="text-coral text-2xl font-bold">{price}</p>
                    <PriceNote
                      updatedAt={racket.price_updated_at}
                      affiliateUrl={racket.affiliate_url}
                      slug={racket.slug}
                      className="mt-0.5"
                    />
                  </div>
                )}
                <div className="flex gap-2 flex-wrap mt-1">
                  {(() => {
                    const nivel = derivarNivel(racket)
                    return nivel ? (
                      <span className="bg-aqua/[0.08] text-aqua text-xs font-semibold px-3 py-1 rounded-full border border-aqua/20">
                        {NIVEL_LABEL[nivel] ?? nivel}
                      </span>
                    ) : null
                  })()}
                  {(ins?.elbow_friendly || ins?.shoulder_friendly) && (
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                      Leve nas articulações
                    </span>
                  )}
                  {racket.weight_g != null && racket.weight_g >= 340 && (
                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full border border-slate-200">
                      Peso alto de fábrica
                    </span>
                  )}
                </div>
              </div>

              {/* CTA compra */}
              {irUrl ? (
                <BuyButton
                  href={irUrl}
                  racketName={racket.name}
                  racketSlug={racket.slug}
                  linkTipo={linkTipo}
                  className="w-full bg-coral text-white font-semibold text-base py-4 rounded-2xl hover:opacity-90 hover:shadow-[0_8px_28px_rgba(255,94,58,0.40)] active:scale-[0.98] transition-all shadow-md text-center block"
                >
                  {price ? `Ver na loja → ${price}` : 'Ver na loja →'}
                </BuyButton>
              ) : (
                <Link
                  href="/?chat=1"
                  className="w-full bg-aqua text-white font-semibold text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md text-center block"
                >
                  Falar com a especialista
                </Link>
              )}

              {/* Perfil resumo */}
              {ins?.perfil_resumo && (
                <div className="bg-white rounded-2xl p-5 shadow-card border border-[rgba(14,58,64,0.06)]">
                  <p className="text-tinta leading-relaxed text-sm">{ins.perfil_resumo}</p>
                </div>
              )}

              {/* Pontuações */}
              {ins && (ins.power !== null || ins.control !== null) && (
                <div className="bg-white rounded-2xl p-5 shadow-card border border-[rgba(14,58,64,0.06)] flex flex-col gap-4">
                  <p className="text-tinta font-semibold text-sm">Avaliação</p>
                  <RacketHexagon racket={racket} />
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
                </div>
              )}

              {/* Specs */}
              <div className="bg-white rounded-2xl p-5 shadow-card border border-[rgba(14,58,64,0.06)]">
                <p className="text-tinta font-semibold text-sm mb-3">Especificações</p>
                <SpecsGrid racket={racket} hideTechRows />
                <MegaSpinLink racketId={racket.id} racketSlug={racket.slug} racketName={racket.name} />
              </div>

              {/* Tecnologias e acabamentos */}
              {tecnologias.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-card border border-[rgba(14,58,64,0.06)]">
                  <p className="text-tinta font-semibold text-sm mb-3">Tecnologias e acabamentos</p>
                  <div className="flex flex-wrap gap-2">
                    {tecnologias.map((t, i) => (
                      <span
                        key={i}
                        className="bg-aqua/[0.07] text-tinta text-xs font-medium px-3 py-1.5 rounded-full border border-aqua/15"
                      >
                        {t.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comparar + Compartilhar */}
              <div className="bg-white rounded-2xl px-5 py-4 shadow-card border border-[rgba(14,58,64,0.06)] flex flex-col gap-4">
                <div className="flex gap-2">
                  <Link
                    href={`/comparar?a=${racket.slug}`}
                    className="flex items-center gap-2 flex-1 border border-gray-200 text-tinta/55 font-medium text-sm py-2.5 px-3.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[#0CC0BE]">
                      <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                      <path d="M8 4.5L11 6.25V9.75L8 11.5L5 9.75V6.25L8 4.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" strokeOpacity="0.4"/>
                      <line x1="8" y1="1" x2="8" y2="4.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35"/>
                      <line x1="14" y1="4.5" x2="11" y2="6.25" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35"/>
                      <line x1="14" y1="11.5" x2="11" y2="9.75" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35"/>
                      <line x1="8" y1="15" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35"/>
                      <line x1="2" y1="11.5" x2="5" y2="9.75" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35"/>
                      <line x1="2" y1="4.5" x2="5" y2="6.25" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35"/>
                    </svg>
                    <span>Comparar</span>
                  </Link>
                  <ShareButton racketName={getDisplayName(racket)} slug={racket.slug} />
                </div>
                {sugestoes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-tinta/40 font-medium">Comparações populares</p>
                    <div className="flex flex-col gap-2">
                      {sugestoes.map(s => (
                        <Link
                          key={s.slug}
                          href={`/comparar/${racket.slug}-vs-${s.slug}`}
                          className="flex items-center gap-3 bg-[#F3FAFA] border border-aqua/10 rounded-2xl px-4 py-3 hover:border-aqua/30 hover:bg-aqua/6 active:scale-[0.98] transition-all"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-aqua/50">
                            <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                            <path d="M8 4.5L11 6.25V9.75L8 11.5L5 9.75V6.25L8 4.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" strokeOpacity="0.4"/>
                          </svg>
                          <span className="flex-1 text-sm font-semibold text-tinta">vs {s.name}</span>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-tinta/25">
                            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CTA secundário */}
              {irUrl && (
                <Link
                  href="/?chat=1"
                  className="w-full text-aqua/80 text-sm font-medium text-center block pt-1 hover:text-aqua active:opacity-70 transition-all underline underline-offset-2"
                >
                  Não tem certeza? Fale com a especialista →
                </Link>
              )}


            </div>{/* fim coluna direita */}
          </div>
        </div>
      </div>
    </>
  )
}
