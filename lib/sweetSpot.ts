export type SweetSpotCategory = 'grande' | 'médio' | 'pequeno'

export function getSweetSpotCategory(forgiveness: number | null | undefined): SweetSpotCategory | null {
  if (forgiveness == null) return null
  return forgiveness >= 7 ? 'grande' : forgiveness >= 5 ? 'médio' : 'pequeno'
}

export function getSweetSpotLabel(forgiveness: number | null | undefined): string | null {
  const cat = getSweetSpotCategory(forgiveness)
  if (!cat) return null
  return cat === 'grande' ? 'maior (perdoa mais os erros)'
    : cat === 'médio'   ? 'médio (equilibrado)'
    : 'menor (exige mais precisão)'
}

export function getSweetSpotChipClass(forgiveness: number | null | undefined): string {
  const cat = getSweetSpotCategory(forgiveness)
  return cat === 'grande'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : cat === 'pequeno' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-100 text-gray-600 border-gray-200'
}
