// Pure type definitions for the admin decision trace.
// No imports — safe to use on both client (DebugPanel) and server (agent, scorer, recommend).

export type FaixaStep = {
  label: string
  result: { peso_min: number; peso_max: number; balance?: string }
  note?: string
  isOverride?: boolean
}

export type FaixaTrace = {
  steps: FaixaStep[]
  conflitos: string[]
}

export type FilterStep = {
  filtro: string
  antes?: number   // absent = initial SQL result (no "before")
  depois: number
  relaxado: boolean
  note?: string
}

export type PrecoDecisionStatus = 'disparo' | 'budget_known' | 'tanto_faz'

export type PrecoDecision = {
  status: PrecoDecisionStatus
  note: string
  rangeMin?: number
  rangeMax?: number
  rangeBrl?: number
}

export type MarcaDecision = {
  marcaPreferida: string | null
  boost: number
  racketsDaMarca: number
  topNaoEDaMarca: boolean
}

export type DecisionTrace = {
  faixaSteps?: FaixaStep[]
  conflitos?: string[]
  filterSteps?: FilterStep[]
  scorerWeights?: Record<string, number>
  precoDecision?: PrecoDecision
  marcaDecision?: MarcaDecision
}

export type LimitWindow = { count: number; limit: number; resetInMs: number }

export type LimitesState = {
  ipPerMin: LimitWindow
  ipPerDay: LimitWindow
  sessao:   LimitWindow | null
  ip: string
}
