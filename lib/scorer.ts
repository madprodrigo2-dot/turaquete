// Deterministic racket scorer — weights from turaquete-matriz-pesos.md Level 2.
// Called by buscarRaquetas to rank candidates before sending to the LLM.
// The LLM receives pre-sorted results and focuses on explaining the ranking,
// not re-ranking on its own.

interface Insights {
  power: number | null; control: number | null; comfort: number | null
  maneuverability: number | null; stability: number | null
  spin: number | null; forgiveness: number | null
}

interface RacketData {
  racket_insights: Insights | null
  specs_extra: Record<string, unknown> | null
}

export interface ScorerProfile {
  nivel?: 'iniciante' | 'intermediario' | 'avancado'
  prioridade?: 'potencia' | 'controle' | 'equilibrio' | 'defesa'
  cotovelo_sensivel?: boolean
  ombro_sensivel?: boolean
  frequencia_alta?: boolean
  contexto_vento?: boolean
}

interface Weights {
  power: number; control: number; comfort: number
  maneuverability: number; spin: number; stability: number; forgiveness: number
}

function baseWeights(profile: ScorerProfile): Weights {
  const dor = profile.cotovelo_sensivel || profile.ombro_sensivel

  // Dor overrides all other profiles
  if (dor) return {
    power: 5, control: 10, comfort: 40,
    maneuverability: 15, spin: 0, stability: 15, forgiveness: 15,
  }

  if (profile.nivel === 'iniciante') return {
    power: 5, control: 15, comfort: 25,
    maneuverability: 20, spin: 0, stability: 10, forgiveness: 25,
  }

  if (profile.prioridade === 'potencia') return {
    power: 30, control: 15, comfort: 10,
    maneuverability: 15, spin: 5, stability: 20, forgiveness: 5,
  }

  if (profile.prioridade === 'controle' || profile.prioridade === 'defesa') return {
    power: 5, control: 30, comfort: 15,
    maneuverability: 15, spin: 5, stability: 20, forgiveness: 10,
  }

  // equilibrio / default — slight favor to control + stability
  return {
    power: 12, control: 18, comfort: 15,
    maneuverability: 15, spin: 7, stability: 18, forgiveness: 15,
  }
}

function applyModifiers(w: Weights, profile: ScorerProfile): Weights {
  const m = { ...w }

  if (profile.frequencia_alta) {
    // Comfort +5, deduct from spin then power (lowest-priority dimensions)
    m.comfort += 5
    const fromSpin = Math.min(m.spin, 5)
    m.spin -= fromSpin
    m.power = Math.max(0, m.power - (5 - fromSpin))
  }

  if (profile.contexto_vento) {
    // Stability +8 for wind resistance, deduct from spin then power
    m.stability += 8
    const fromSpin = Math.min(m.spin, 8)
    m.spin -= fromSpin
    m.power = Math.max(0, m.power - Math.max(0, 8 - fromSpin))
  }

  return m
}

export function scoreRacket(racket: RacketData, profile: ScorerProfile): number {
  const ins = racket.racket_insights
  if (!ins) return 0

  const w = applyModifiers(baseWeights(profile), profile)
  const totalWeight = w.power + w.control + w.comfort + w.maneuverability + w.spin + w.stability + w.forgiveness
  if (totalWeight === 0) return 0

  const raw =
    (ins.power           ?? 0) * w.power +
    (ins.control         ?? 0) * w.control +
    (ins.comfort         ?? 0) * w.comfort +
    (ins.maneuverability ?? 0) * w.maneuverability +
    (ins.spin            ?? 0) * w.spin +
    (ins.stability       ?? 0) * w.stability +
    (ins.forgiveness     ?? 0) * w.forgiveness

  let score = raw / totalWeight

  // Furos bonus for wind context: 30+ furos cuts wind drag noticeably
  if (profile.contexto_vento) {
    const furos = racket.specs_extra?.furos as number | undefined
    if (furos != null && furos >= 30) score += 0.3
  }

  return Math.round(score * 10) / 10
}
