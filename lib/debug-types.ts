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

export type DecisionTrace = {
  faixaSteps?: FaixaStep[]
  conflitos?: string[]
  filterSteps?: FilterStep[]
  scorerWeights?: Record<string, number>
}
