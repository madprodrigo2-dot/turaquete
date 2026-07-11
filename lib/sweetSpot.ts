export type SweetSpotCategory = 'grande' | 'médio' | 'pequeno'

export interface SweetSpotCopy {
  label: string      // "Generoso" | "Equilibrado" | "Exigente"
  chip: string       // texto curto do chip: "Perdoa erros" | "Equilibrada" | "Exige precisão"
  descricao: string  // texto do detalhe expansível
}

const SWEET_SPOT_COPY: Record<SweetSpotCategory, SweetSpotCopy> = {
  grande: {
    label: 'Generoso',
    chip: 'Perdoa erros',
    descricao:
      'Perdoa golpes fora do centro. Mesmo quando você não acerta em cheio, a bola sai bem e vibra menos no braço. Ideal para quem está evoluindo ou quer jogar sem dor.',
  },
  médio: {
    label: 'Equilibrado',
    chip: 'Equilibrada',
    descricao:
      'Boa área de acerto, com resposta mais viva no centro. Equilíbrio entre perdão e desempenho.',
  },
  pequeno: {
    label: 'Exigente',
    chip: 'Exige precisão',
    descricao:
      'Área nobre menor: no centro, resposta máxima. Fora dele, a bola perde força e você sente a trepidação. Para quem já acerta com consistência.',
  },
}

export function getSweetSpotCategory(forgiveness: number | null | undefined): SweetSpotCategory | null {
  if (forgiveness == null) return null
  return forgiveness >= 7 ? 'grande' : forgiveness >= 5 ? 'médio' : 'pequeno'
}

export function getSweetSpotCopy(forgiveness: number | null | undefined): SweetSpotCopy | null {
  const cat = getSweetSpotCategory(forgiveness)
  return cat ? SWEET_SPOT_COPY[cat] : null
}

export function getSweetSpotChipClass(forgiveness: number | null | undefined): string {
  const cat = getSweetSpotCategory(forgiveness)
  return cat === 'grande'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : cat === 'pequeno' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-100 text-gray-600 border-gray-200'
}

// Constantes usadas por Tury (agent.ts) — única fonte de verdade
export const SWEET_SPOT_HIGHLIGHT   = 'Sweet spot generoso'
export const SWEET_SPOT_COMPARISON  = 'A de sweet spot mais amplo'
