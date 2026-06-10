import { listarMarcas, listarRaquetas } from '@/lib/recommend'
import HomeClient from '@/components/HomeClient'

export default async function Page() {
  const [brands, featured] = await Promise.all([
    listarMarcas().catch(() => []),
    listarRaquetas().then(r => r.slice(0, 3)).catch(() => []),
  ])
  return <HomeClient brands={brands} featuredRackets={featured} />
}
