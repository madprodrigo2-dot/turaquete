// Deterministic racket scorer — weights from turaquete-matriz-pesos.md Level 2.
// Called by buscarRaquetas to rank candidates before sending to the LLM.
// The LLM receives pre-sorted results and focuses on explaining the ranking,
// not re-ranking on its own.

// ── Fitting profile ──────────────────────────────────────────────────────────

export interface FittingProfile {
  nivel?: 'iniciante' | 'intermediario' | 'avancado'
  estilo?: 'ofensivo' | 'defensivo' | 'misto'
  idade?: number
  porte?: 'menudo' | 'normal' | 'grande'
  forca_declarada?: 'fraca' | 'forte'
  jogo_aereo_predominante?: boolean
  cotovelo_sensivel?: boolean
  ombro_sensivel?: boolean
  // Gender: pass only when revealed organically (grammar, context). Never ask.
  genero_organico?: 'masculino' | 'feminino'
}

export interface FaixaIdeal {
  peso_min: number
  peso_max: number
  balance_preferido: string
  prioridades: string[]
}

// Physical minimum: below 315g the racket lacks mass to absorb impact and vibrates too much.
// This rule was validated by Rodrigo and is inviolable — no faixa ever goes below this.
const CATALOGO_FLOOR = 315

export function calcular_faixa_ideal(p: FittingProfile): FaixaIdeal {
  const dor = p.cotovelo_sensivel || p.ombro_sensivel

  // Base range by nivel + estilo
  let peso_min: number
  let peso_max: number
  let balance_preferido: string
  let prioridades: string[]

  if (p.nivel === 'avancado') {
    if (p.estilo === 'ofensivo') {
      peso_min = 325; peso_max = 345; balance_preferido = 'medio_ou_cabeca'
      prioridades = ['potência', 'estabilidade', 'controle']
    } else if (p.estilo === 'defensivo') {
      peso_min = 315; peso_max = 325; balance_preferido = 'medio_ou_cabo'
      prioridades = ['controle', 'estabilidade', 'manuseio']
    } else {
      peso_min = 315; peso_max = 335; balance_preferido = 'medio'
      prioridades = ['controle', 'estabilidade', 'potência']
    }
  } else if (p.nivel === 'intermediario') {
    if (p.estilo === 'ofensivo') {
      peso_min = 320; peso_max = 330; balance_preferido = 'medio'
      prioridades = ['equilíbrio', 'potência']
    } else if (p.estilo === 'defensivo') {
      peso_min = 315; peso_max = 328; balance_preferido = 'medio'
      prioridades = ['controle', 'estabilidade', 'manuseio']
    } else {
      peso_min = 315; peso_max = 330; balance_preferido = 'medio'
      prioridades = ['equilíbrio', 'controle']
    }
  } else {
    // iniciante or unknown
    peso_min = 315; peso_max = 325; balance_preferido = 'medio_ou_cabo'
    prioridades = ['sweet spot generoso', 'conforto', 'manuseio']
  }

  // Modifier: porte/forca (only if the person mentioned it spontaneously)
  const porte_menudo = p.porte === 'menudo' || p.forca_declarada === 'fraca'
  const porte_grande = p.porte === 'grande' || p.forca_declarada === 'forte'
  if (porte_menudo) { peso_min -= 10; peso_max -= 10 }  // floor clamp below brings to 315
  if (porte_grande) { peso_min += 10; peso_max += 10 }

  // Modifier: gender (organic signal only — never asked). Men floor at 320g.
  // Calibration: men in beach tennis reliably hit harder and sustain more g without fatigue.
  if (p.genero_organico === 'masculino') {
    peso_min = Math.max(peso_min, 320)
  }

  // Modifier: age (absolute overrides for 50+ — comfort mandate)
  if (p.idade != null) {
    if (p.idade >= 65) {
      // Absolute override — lightest safe range, never head-heavy
      peso_min = 315; peso_max = 320
      balance_preferido = 'medio_ou_cabo'
      prioridades = ['conforto', 'sweet spot generoso', 'tolerância']
    } else if (p.idade >= 50) {
      // Absolute override — comfort range regardless of level
      peso_min = 315; peso_max = 325
      if (balance_preferido === 'medio_ou_cabeca') balance_preferido = 'medio'
      balance_preferido = balance_preferido === 'medio' ? 'medio_ou_cabo' : balance_preferido
      if (!dor) prioridades = ['conforto', 'sweet spot generoso', ...prioridades]
    } else if (p.idade >= 13 && p.idade <= 17) {
      // Adolescent: light end of their level range
      peso_max = peso_min + 10
    }
  }

  // Modifier: jogo aéreo/de rede → push toward light end of range
  if (p.jogo_aereo_predominante) { peso_min -= 5; peso_max -= 5 }

  // HARD RULE: lesão → 315-320g, never head-heavy balance, comfort always first
  if (dor) {
    peso_min = 315
    peso_max = Math.min(peso_max, 320)
    if (balance_preferido === 'medio_ou_cabeca') balance_preferido = 'medio'
    prioridades = ['conforto', 'sweet spot generoso', 'manuseio', 'estabilidade']
  }

  // Clamp to physical floor — 315g minimum, inviolable
  peso_min = Math.max(peso_min, CATALOGO_FLOOR)
  peso_max = Math.max(peso_max, CATALOGO_FLOOR + 5)
  if (peso_min > peso_max) peso_max = peso_min + 5

  return { peso_min, peso_max, balance_preferido, prioridades }
}

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

  // comfort already encodes antivib. anchor: 0 verified systems→≈5, 1→≈8, 2+→≈9
  // (see turaquete-taxonomia-tecnologias.md §"Ajuste de ancla")
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
