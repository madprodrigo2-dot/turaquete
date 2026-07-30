import type { MetadataRoute } from 'next'
import { listarRaquetas, listarMarcas } from '@/lib/recommend'

const BASE = 'https://www.turaquete.com.br'

// Fixed dates represent the last meaningful content change per group.
// Using real dates prevents the sitemap from reporting "modified today"
// on every deploy, which wastes Google's crawl budget signal.
const D_STATIC = new Date('2026-06-01') // last major layout/copy overhaul
const D_GUIA   = new Date('2026-07-01') // guia content last updated
const D_BRAND  = new Date('2026-07-30') // brand catalog stable; update when brands change

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [rackets, brands] = await Promise.all([
    listarRaquetas().catch(() => []),
    listarMarcas().catch(() => []),
  ])

  const CATEGORY_SLUGS = [
    'iniciante', 'intermediario', 'avancado', 'conforto',
    'custo-beneficio', 'ate-1000',
  ]

  const GUIA_SLUGS = [
    '', 'peso', 'balance', 'material', 'eva', 'espessura',
    'furos', 'coracao', 'textura', 'sweet-spot', 'formato',
  ]

  return [
    { url: BASE,                      lastModified: D_STATIC,  changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/perfil`,          lastModified: D_STATIC,  changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/comparar`,        lastModified: D_STATIC,  changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/privacidade`,     lastModified: D_STATIC,  changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE}/termos`,          lastModified: D_STATIC,  changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE}/para-lojas`,      lastModified: D_STATIC,  changeFrequency: 'yearly',  priority: 0.2 },
    ...GUIA_SLUGS.map(slug => ({
      url: slug ? `${BASE}/guia/${slug}` : `${BASE}/guia`,
      lastModified: D_GUIA,
      changeFrequency: 'monthly' as const,
      priority: slug ? 0.8 : 0.9,
    })),
    ...CATEGORY_SLUGS.map(slug => ({
      url: `${BASE}/raquetes/${slug}`,
      lastModified: D_BRAND,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...rackets.map(r => ({
      url: `${BASE}/raquetes/${r.slug}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : D_STATIC,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...brands
      .filter(b => b.status === 'disponivel')
      .map(b => ({
        url: `${BASE}/marcas/${b.slug}`,
        lastModified: D_BRAND,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
  ]
}
