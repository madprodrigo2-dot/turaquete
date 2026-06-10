import { listarMarcas, listarRaquetas, getRaquetaPorSlug } from '@/lib/recommend'
import HomeClient from '@/components/HomeClient'

export default async function Page() {
  const [brands, featured, previewRacket] = await Promise.all([
    listarMarcas().catch(() => []),
    listarRaquetas().then(r => r.slice(0, 3)).catch(() => []),
    getRaquetaPorSlug('ceu').catch(() => null),
  ])
  return <HomeClient brands={brands} featuredRackets={featured} previewRacket={previewRacket ?? undefined} />
}
