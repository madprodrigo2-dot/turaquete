export const revalidate = 300

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getRaquetaPorSlug, listarRaquetas } from '@/lib/recommend'
import BuyButton from '@/components/BuyButton'
import BackButton from '@/components/BackButton'
import AthleteBadge from '@/components/AthleteBadge'
import SpecsGrid, { NIVEL_LABEL } from '@/components/SpecsGrid'
import ScoreSection from '@/components/ScoreSection'
import RacketKeyStats from '@/components/RacketKeyStats'
import RacketHexagon from '@/components/RacketHexagon'
import { derivarNivel } from '@/lib/nivel'
import PriceNote from '@/components/PriceNote'

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
    `Especificações reais, avaliação e onde comprar a ${racket.name}.${price ? ` A partir de ${price}.` : ''}`

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.turaquete.com.br/raquetes/${slug}`,
    },
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
  const [racket, allRackets] = await Promise.all([
    getRaquetaPorSlug(slug),
    listarRaquetas().catch(() => []),
  ])
  if (!racket) notFound()

  // Strip year suffixes and common qualifiers to detect same model series
  function modelSeries(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b20\d{2}\b/g, '')
      .replace(/\b(luxury|ltd|limited|pro cup|cup)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  // Brand-prefixed names (Head, Adidas, Drop Shot, Kona) — skip to avoid
  // matching all models of a brand as "same family"
  const BRAND_FIRST_WORDS = new Set(['head', 'adidas', 'drop', 'kona'])
  function sameFamily(a: string, b: string): boolean {
    const sa = modelSeries(a)
    const sb = modelSeries(b)
    if (sa === sb) return true
    const firstA = sa.split(' ')[0]
    if (firstA.length < 3 || BRAND_FIRST_WORDS.has(firstA)) return false
    return firstA === sb.split(' ')[0]
  }

  const sugestoes = allRackets
    .filter(r => r.slug !== racket.slug)
    .map(r => ({
      r,
      score:
        (sameFamily(r.name, racket.name) ? 20 : 0) +
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
  const irUrl    = buyUrl ? `/ir/${racket.slug}` : null
  const linkTipo: 'afiliado' | 'oficial' = racket.affiliate_url ? 'afiliado' : 'oficial'

  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: racket.name,
    ...(ins?.perfil_resumo && { description: ins.perfil_resumo }),
    ...(racket.image_url && { image: racket.image_url }),
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
        {/* Nav */}
        <div className="sticky top-0 z-30 bg-[#FBF6EF]/90 backdrop-blur-sm border-b border-[rgba(14,58,64,0.06)]">
          <div className="max-w-4xl mx-auto px-5 md:px-8 py-3">
            <BackButton fallbackHref={racket.brands?.slug ? `/marcas/${racket.brands.slug}` : '/'} />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 flex flex-col gap-6">

          {/* Desktop: duas colunas. Mobile: empilhado como antes. */}
          <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-6 md:items-start">

            {/* Imagem */}
            <div className="bg-white rounded-2xl p-6 flex items-center justify-center shadow-card border border-[rgba(14,58,64,0.06)] min-h-[180px]">
              {racket.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={racket.image_url}
                  alt={racket.name}
                  className="object-contain max-h-64 md:max-h-[500px] w-auto"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-aqua/30">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <ellipse cx="12" cy="9.5" rx="6" ry="7.5" fill="currentColor" />
                    <rect x="10.5" y="16" width="3" height="7" rx="1.5" fill="currentColor" />
                  </svg>
                  <span className="text-xs text-tinta/30">{racket.name}</span>
                </div>
              )}
            </div>

            {/* Título + preço + badges + CTA e specs resumidas (só desktop) */}
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-tinta leading-tight">{racket.name}</h1>
              {price && (
                <div>
                  <p className="text-coral text-xl font-bold">{price}</p>
                  <PriceNote
                    updatedAt={racket.price_updated_at}
                    affiliateUrl={racket.affiliate_url}
                    className="mt-0.5"
                  />
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {athlete && <AthleteBadge athlete={athlete} />}
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

              {irUrl && (
                <div className="hidden md:block mt-2">
                  <BuyButton
                    href={irUrl}
                    racketName={racket.name}
                    racketSlug={racket.slug}
                    linkTipo={linkTipo}
                    className="w-full bg-coral text-white font-semibold text-base py-4 rounded-2xl hover:opacity-90 hover:shadow-[0_8px_28px_rgba(255,94,58,0.40)] active:scale-[0.98] transition-all shadow-md text-center block"
                  >
                    {price ? `Comprar por ${price}` : 'Ver onde comprar'}
                  </BuyButton>
                </div>
              )}

              {(racket.weight_g || racket.face_material || racket.model_year) && (
                <div className="hidden md:flex flex-col gap-2 border-t border-aqua/10 pt-3 mt-1">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-tinta/60">Peso</span>
                      <span className="text-tinta font-medium">
                        {racket.weight_g ? `~${racket.weight_g}g` : 'não informado'}
                      </span>
                    </div>
                    <p className="text-[10px] text-tinta/35 leading-snug text-right">
                      Informado pelo fabricante, pode variar conforme tolerância e grip.
                    </p>
                  </div>
                  {racket.face_material && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-tinta/60">Material da face</span>
                      <span className="text-tinta font-medium capitalize">{racket.face_material}</span>
                    </div>
                  )}
                  {racket.balance && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-tinta/60">Balance</span>
                      <span className="text-tinta font-medium capitalize">{racket.balance}</span>
                    </div>
                  )}
                  {racket.model_year && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-tinta/60">Ano</span>
                      <span className="text-tinta font-medium">{racket.model_year}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Perfil resumo */}
          {ins?.perfil_resumo && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-[rgba(14,58,64,0.06)]">
              <p className="text-tinta leading-relaxed text-sm md:text-base">{ins.perfil_resumo}</p>
            </div>
          )}

          {/* Pontuações */}
          {ins && (ins.power !== null || ins.control !== null) && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-[rgba(14,58,64,0.06)] flex flex-col gap-4">
              <p className="text-tinta font-semibold text-sm md:text-base">Avaliação</p>
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

          {/* Comparar */}
          <div className="bg-white rounded-2xl px-5 py-4 shadow-card border border-[rgba(14,58,64,0.06)] flex flex-col gap-3">
            <Link
              href={`/comparar?a=${racket.slug}`}
              className="flex items-center justify-between gap-3 w-full border border-aqua/35 text-aqua font-semibold text-sm py-3 px-4 rounded-xl hover:bg-aqua/5 active:scale-[0.98] transition-all"
            >
              <span>Comparar a {racket.name} com outra</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            {sugestoes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-tinta/40 font-medium">Comparações sugeridas</p>
                <div className="flex flex-col gap-1">
                  {sugestoes.map(s => (
                    <Link
                      key={s.slug}
                      href={`/comparar/${racket.slug}-vs-${s.slug}`}
                      className="text-xs text-aqua/70 hover:text-aqua transition-colors hover:underline leading-relaxed"
                    >
                      {racket.name} vs {s.name} →
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Specs */}
          <div className="bg-white rounded-2xl p-5 shadow-card border border-[rgba(14,58,64,0.06)]">
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
              className="w-full bg-coral text-white font-semibold text-base py-4 rounded-2xl hover:opacity-90 hover:shadow-[0_8px_28px_rgba(255,94,58,0.40)] active:scale-[0.98] transition-all shadow-md text-center block"
            >
              {price ? `Comprar por ${price}` : 'Ver onde comprar'}
            </BuyButton>
          ) : (
            <Link
              href="/?chat=1"
              className="w-full bg-aqua text-white font-semibold text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md text-center block"
            >
              Falar com a especialista
            </Link>
          )}

          {/* Falar com especialista (secundário, sempre presente) */}
          {irUrl && (
            <Link
              href="/?chat=1"
              className="w-full border border-aqua/40 text-aqua font-semibold text-sm py-3 rounded-2xl hover:bg-aqua/10 active:scale-[0.98] transition-all text-center block"
            >
              Não tem certeza? Fale com a especialista
            </Link>
          )}

          {price && (
            <PriceNote
              updatedAt={racket.price_updated_at}
              affiliateUrl={racket.affiliate_url}
              className="text-center"
            />
          )}

          <p className="text-center text-tinta/40 text-xs leading-relaxed">
            A Turaquete pode receber comissão por compras feitas pelos links indicados, sem custo extra pra você.
          </p>

        </div>
      </div>
    </>
  )
}
