import { listarMarcas, getRaquetasPorSlug, getRaquetaPorSlug } from '@/lib/recommend'
import HomeClient from '@/components/HomeClient'

export const revalidate = 3600

// ── Carrusel de destaques — editar slugs aqui para mudar a seleção ─────────────
const FEATURED_SLUGS = [
  'beast-2023',
  'ceu',
  'harley-25',
  'rebel-25',
  'starlight-ruby',
  'kronos-25',
] as const

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://turaquete.com.br/#website',
      url: 'https://turaquete.com.br',
      name: 'Turaquete',
      description: 'Especialista em raquetes de beach tennis',
      inLanguage: 'pt-BR',
    },
    {
      '@type': 'Organization',
      '@id': 'https://turaquete.com.br/#organization',
      name: 'Turaquete',
      url: 'https://turaquete.com.br',
      logo: {
        '@type': 'ImageObject',
        url: 'https://turaquete.com.br/turaquete-logo.png',
        width: '400',
        height: '120',
      },
    },
  ],
}

export default async function Page() {
  const [brands, featured, previewRacket] = await Promise.all([
    listarMarcas().catch(() => []),
    getRaquetasPorSlug(FEATURED_SLUGS).catch(() => []),
    getRaquetaPorSlug('ceu').catch(() => null),
  ])
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient
        brands={brands}
        featuredRackets={featured}
        featuredSource="curated"
        previewRacket={previewRacket ?? undefined}
      />
    </>
  )
}
