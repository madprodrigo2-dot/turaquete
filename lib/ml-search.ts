const AFFILIATE_TAG = 'matt_word=madariagarodrigo20221014140538&matt_tool=94105833'

export const SEARCH_FALLBACK_UNCOVERED = false

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/̀-ͯ/g, '')
    .toLowerCase()
    .replace(/\b20\d{2}\b/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildMlSearchUrl(racket: {
  name: string
  brands?: { name: string; slug?: string } | null
}): string {
  const brand = racket.brands?.name ?? ''
  // Skip brand prefix if the racket name already starts with it
  const nameNorm = racket.name.toLowerCase()
  const brandNorm = brand.toLowerCase()
  const racketPart = brandNorm && nameNorm.startsWith(brandNorm)
    ? racket.name.slice(brand.length).trim()
    : racket.name
  const term = slugify(`raquete beach tennis ${brand} ${racketPart}`)
  return `https://lista.mercadolivre.com.br/${term}?${AFFILIATE_TAG}`
}
