import type { MetadataRoute } from 'next'
import { listarRaquetas, listarMarcas } from '@/lib/recommend'

const BASE = 'https://www.turaquete.com.br'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [rackets, brands] = await Promise.all([
    listarRaquetas().catch(() => []),
    listarMarcas().catch(() => []),
  ])

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/comparar`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    ...rackets.map(r => ({
      url: `${BASE}/raquetes/${r.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...brands
      .filter(b => b.status === 'disponivel')
      .map(b => ({
        url: `${BASE}/marcas/${b.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
  ]
}
