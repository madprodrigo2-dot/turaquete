import { listarMarcas, getTopRaquetas, getRaquetaPorSlug } from '@/lib/recommend'
import HomeClient from '@/components/HomeClient'

// Regenerate every 5 min so the recommendation carousel reflects recent data.
// Edit CURATED_SLUGS in lib/recommend.ts to change the cold-start fallback.
export const revalidate = 300

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.turaquete.com.br/#website',
      url: 'https://www.turaquete.com.br',
      name: 'Turaquete',
      description: 'Especialista em raquetes de beach tennis',
      inLanguage: 'pt-BR',
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.turaquete.com.br/#organization',
      name: 'Turaquete',
      url: 'https://www.turaquete.com.br',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.turaquete.com.br/turaquete-logo.png',
        width: '400',
        height: '120',
      },
    },
  ],
}

export default async function Page() {
  const [brands, featured, previewRacket] = await Promise.all([
    listarMarcas().catch(() => []),
    getTopRaquetas().catch(() => ({ rackets: [], source: 'curated' as const })),
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
        featuredRackets={featured.rackets}
        featuredSource={featured.source}
        previewRacket={previewRacket ?? undefined}
      />
    </>
  )
}
