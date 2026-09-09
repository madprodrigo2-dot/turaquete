import type { MetadataRoute } from 'next'
import { listarRaquetas, listarMarcas, suggestComparisons, RacketWithInsights } from '@/lib/recommend'
import { POPULAR_PAIRS } from '@/lib/popular-pairs'

const BASE = 'https://www.turaquete.com.br'

// Fixed dates represent the last meaningful content change per group.
// Using real dates prevents the sitemap from reporting "modified today"
// on every deploy, which wastes Google's crawl budget signal.
const D_STATIC = new Date('2026-06-01') // last major layout/copy overhaul
const D_GUIA   = new Date('2026-07-01') // guia content last updated
const D_BRAND  = new Date('2026-07-30') // brand catalog stable; update when brands change

// URLs de comparação: mesma regra de "Comparações populares" usada nas fichas
// de produto (suggestComparisons), + os pares fixos curados do picker. Cada
// par entra só uma vez no sitemap (independente da ordem A-vs-B / B-vs-A) pra
// não indexar duas URLs de conteúdo quase idêntico.
function buildCompareEntries(rackets: RacketWithInsights[]): MetadataRoute.Sitemap {
  const bySlug = new Map(rackets.map(r => [r.slug, r]))
  const seen = new Set<string>()
  const entries: MetadataRoute.Sitemap = []

  function addPair(slugA: string, slugB: string) {
    const key = [slugA, slugB].sort().join('|')
    if (seen.has(key)) return
    const ra = bySlug.get(slugA)
    const rb = bySlug.get(slugB)
    if (!ra || !rb) return
    seen.add(key)
    const dates = [ra.updated_at, rb.updated_at].filter((d): d is string => !!d).map(d => new Date(d))
    const lastModified = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : D_STATIC
    entries.push({
      url: `${BASE}/comparar/${slugA}-vs-${slugB}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }

  for (const racket of rackets) {
    for (const s of suggestComparisons(racket, rackets, 6)) {
      addPair(racket.slug, s.slug)
    }
  }
  for (const pair of POPULAR_PAIRS) {
    addPair(pair.a.slug, pair.b.slug)
  }

  return entries
}

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
    ...buildCompareEntries(rackets),
  ]
}
