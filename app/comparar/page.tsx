import type { Metadata } from 'next'
import { listarRaquetasCached, type RacketWithInsights } from '@/lib/recommend'
import ComparePageClient from '@/components/ComparePageClient'
import SiteNav from '@/components/SiteNav'
import { SITE_URL } from '@/lib/site'

// Sem searchParams aqui de propósito: ler ?a=/?b= no servidor torna a rota
// dinâmica e ignora o revalidate (ver ComparePageClient, que lê no cliente).
export const revalidate = 3600

function computePopularPairs(rackets: RacketWithInsights[]) {
  const byBrand = new Map<string, RacketWithInsights[]>()
  for (const r of rackets) {
    const brand = r.brands?.name ?? ''
    if (!brand) continue
    if (!byBrand.has(brand)) byBrand.set(brand, [])
    byBrand.get(brand)!.push(r)
  }
  const pairs: { name: string; slug: string }[][] = []
  for (const [, rks] of byBrand) {
    if (rks.length < 2 || pairs.length >= 3) continue
    const sorted = [...rks].sort((a, b) => {
      if (a.price == null && b.price == null) return 0
      if (a.price == null) return 1
      if (b.price == null) return -1
      return a.price - b.price
    })
    const mid = Math.floor((sorted.length - 1) / 2)
    pairs.push([
      { name: sorted[mid].name, slug: sorted[mid].slug },
      { name: sorted[mid + 1].name, slug: sorted[mid + 1].slug },
    ])
  }
  return pairs
}

export const metadata: Metadata = {
  title: 'Comparar Raquetes de Beach Tennis',
  description: 'Compare raquetes de beach tennis lado a lado. Veja pontuacoes, especificacoes e precos para escolher a melhor opcao para o seu jogo.',
  alternates: { canonical: `${SITE_URL}/comparar` },
}

export default async function CompararPage() {
  const rackets = await listarRaquetasCached().catch(() => [] as RacketWithInsights[])
  const popularPairs = computePopularPairs(rackets)

  return (
    <div className="min-h-screen sand-texture">
      <SiteNav maxWidth="max-w-4xl lg:max-w-7xl" />

      <div className="max-w-4xl lg:max-w-7xl mx-auto px-5 md:px-8 py-8 flex flex-col gap-6">
        <ComparePageClient rackets={rackets} popularPairs={popularPairs} />
      </div>
    </div>
  )
}
