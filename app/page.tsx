import { listarMarcas, getTopRaquetas, getRaquetaPorSlug } from '@/lib/recommend'
import HomeClient from '@/components/HomeClient'

export const revalidate = 3600

export default async function Page() {
  const [brands, featured, previewRacket] = await Promise.all([
    listarMarcas().catch(() => []),
    getTopRaquetas().catch(() => ({ rackets: [], source: 'curated' as const })),
    getRaquetaPorSlug('ceu').catch(() => null),
  ])
  return (
    <HomeClient
      brands={brands}
      featuredRackets={featured.rackets}
      featuredSource={featured.source}
      previewRacket={previewRacket ?? undefined}
    />
  )
}
