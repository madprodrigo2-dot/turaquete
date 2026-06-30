import type { Metadata } from 'next'
import { listarRaquetas, type RacketWithInsights } from '@/lib/recommend'
import ComparePicker from '@/components/ComparePicker'
import SiteNav from '@/components/SiteNav'

export const revalidate = 300

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
  title: 'Comparar Raquetes de Beach Tennis | Turaquete',
  description: 'Compare raquetes de beach tennis lado a lado. Veja pontuacoes, especificacoes e precos para escolher a melhor opcao para o seu jogo.',
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const { a, b } = await searchParams
  const rackets = await listarRaquetas().catch(() => [])
  const initialSlotA = a ? rackets.find(r => r.slug === a) : undefined
  const initialSlotB = b ? rackets.find(r => r.slug === b) : undefined
  const popularPairs = computePopularPairs(rackets)

  return (
    <div className="min-h-screen sand-texture">
      <SiteNav />

      <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-bold text-tinta">Comparar raquetes</h1>
          <p className="text-tinta/60 text-sm">
            {initialSlotA
              ? `${initialSlotA.name} já está no slot A — escolha a segunda raquete.`
              : 'Escolha duas raquetes para comparar pontuações e especificações lado a lado.'}
          </p>
        </div>
        <ComparePicker rackets={rackets} initialSlotA={initialSlotA} initialSlotB={initialSlotB} popularPairs={popularPairs} />
      </div>
    </div>
  )
}
