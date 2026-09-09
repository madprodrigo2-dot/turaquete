export const SITE_URL = 'https://www.turaquete.com.br'

// JSON-LD BreadcrumbList — item[].url é opcional; a última posição (a página
// atual) costuma vir sem url, mas aceitamos se for passada.
export function breadcrumbJsonLd(items: { name: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  }
}
