import type { FaixaStep, FaixaTrace } from './debug-types'

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
  punho_sensivel?: boolean
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
  const dor = p.cotovelo_sensivel || p.ombro_sensivel || p.punho_sensivel

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

  // Injury rules: no head-heavy balance; comfort always first.
  // Weight policy differs by injury site:
  //   cotovelo (epicondilite): range stays profile-driven (level/build/gender already ran),
  //     capped at 315–335g. A well-cushioned 330g absorbs impact better than a very light
  //     racket — which lacks mass to dampen the blow and forces the arm to generate power.
  //   ombro, or both sites: lighter IS genuinely better → strict 315–320g.
  if (dor) {
    // All injuries: profile-driven range capped at 315–335g.
    // Mass absorbs impact; very light forces the arm to generate power, worsening symptoms.
    if (balance_preferido === 'medio_ou_cabeca') balance_preferido = 'medio'
    peso_min = Math.max(315, Math.min(peso_min, 330))
    peso_max = 335
    prioridades = ['conforto', 'estabilidade', 'sweet spot generoso', 'manuseio']
  }

  // Guarantee minimum window — narrower than factory variation (±10g) is inconsistent.
  // Skip for safety overrides: injury rules and age ≥50 intentionally restrict range.
  const hasOverride = (p.idade != null && p.idade >= 50) || !!dor
  if (!hasOverride) {
    const MIN_WINDOW = 15
    if (peso_max - peso_min < MIN_WINDOW) peso_max = peso_min + MIN_WINDOW
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
  punho_sensivel?: boolean
  frequencia_alta?: boolean
  contexto_vento?: boolean
}

interface Weights {
  power: number; control: number; comfort: number
  maneuverability: number; spin: number; stability: number; forgiveness: number
}

function baseWeights(profile: ScorerProfile): Weights {
  const dor = profile.cotovelo_sensivel || profile.ombro_sensivel || profile.punho_sensivel

  // Dor overrides all other profiles
  if (dor) return {
    power: 5, control: 10, comfort: 40,
    maneuverability: 15, spin: 0, stability: 15, forgiveness: 15,
  }

  if (profile.nivel === 'iniciante') return {
    power: 5, control: 15, comfort: 20,
    maneuverability: 17, spin: 0, stability: 18, forgiveness: 25,
  }

  if (profile.prioridade === 'potencia') return {
    power: 32, control: 15, comfort: 10,
    maneuverability: 15, spin: 0, stability: 23, forgiveness: 5,
  }

  if (profile.prioridade === 'controle' || profile.prioridade === 'defesa') return {
    power: 5, control: 32, comfort: 15,
    maneuverability: 15, spin: 0, stability: 23, forgiveness: 10,
  }

  // intermediario sem prioridade declarada
  if (profile.nivel === 'intermediario') return {
    power: 12, control: 25, comfort: 12,
    maneuverability: 15, spin: 0, stability: 25, forgiveness: 11,
  }

  // avançado misto / default — maneuserability sobe (net play) e forgiveness cai (hit limpo)
  return {
    power: 20, control: 23, comfort: 6,
    maneuverability: 20, spin: 0, stability: 23, forgiveness: 8,
  }
}

function applyModifiers(w: Weights, profile: ScorerProfile): Weights {
  const m = { ...w }

  if (profile.frequencia_alta) {
    // Comfort +5, deduct from forgiveness then power
    m.comfort += 5
    const fromForg = Math.min(m.forgiveness, 5)
    m.forgiveness -= fromForg
    m.power = Math.max(0, m.power - (5 - fromForg))
  }

  if (profile.contexto_vento) {
    // Stability +8, deduct from forgiveness then power
    m.stability += 8
    const fromForg = Math.min(m.forgiveness, 8)
    m.forgiveness -= fromForg
    m.power = Math.max(0, m.power - Math.max(0, 8 - fromForg))
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

// ── Decision-trace variants (admin debug only) ────────────────────────────────

export function calcular_faixa_ideal_traced(p: FittingProfile): { faixa: FaixaIdeal; trace: FaixaTrace } {
  const dor = p.cotovelo_sensivel || p.ombro_sensivel || p.punho_sensivel
  const steps: FaixaStep[] = []
  const conflitos: string[] = []

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
    peso_min = 315; peso_max = 325; balance_preferido = 'medio_ou_cabo'
    prioridades = ['sweet spot generoso', 'conforto', 'manuseio']
  }
  steps.push({
    label: `base [${p.nivel ?? 'desconhecido'}/${p.estilo ?? 'não especificado'}]`,
    result: { peso_min, peso_max, balance: balance_preferido },
  })

  const porte_menudo = p.porte === 'menudo' || p.forca_declarada === 'fraca'
  const porte_grande = p.porte === 'grande' || p.forca_declarada === 'forte'
  if (porte_menudo) {
    const prev = { peso_min, peso_max }
    peso_min -= 10; peso_max -= 10
    steps.push({ label: '+ porte menudo / força fraca', result: { peso_min, peso_max }, note: `${prev.peso_min}–${prev.peso_max} → ${peso_min}–${peso_max}g` })
  }
  if (porte_grande) {
    const prev = { peso_min, peso_max }
    peso_min += 10; peso_max += 10
    steps.push({ label: '+ porte grande / força forte', result: { peso_min, peso_max }, note: `${prev.peso_min}–${prev.peso_max} → ${peso_min}–${peso_max}g` })
  }

  if (p.genero_organico === 'masculino') {
    const prev = peso_min
    peso_min = Math.max(peso_min, 320)
    if (peso_min !== prev) {
      steps.push({ label: '+ gênero masculino (floor 320g)', result: { peso_min, peso_max }, note: `min ${prev} → ${peso_min}g` })
    }
  }

  if (p.idade != null) {
    if (p.idade >= 65) {
      if (p.nivel === 'avancado' || p.nivel === 'intermediario') {
        conflitos.push(`idade ${p.idade}+ → override absoluto 315–320g, ignora nível ${p.nivel}`)
      }
      const prev = { peso_min, peso_max, b: balance_preferido }
      peso_min = 315; peso_max = 320; balance_preferido = 'medio_ou_cabo'
      prioridades = ['conforto', 'sweet spot generoso', 'tolerância']
      steps.push({ label: '+ idade ≥65 (override absoluto)', result: { peso_min, peso_max, balance: balance_preferido }, note: `${prev.peso_min}–${prev.peso_max}g, ${prev.b} → 315–320g, medio_ou_cabo`, isOverride: true })
    } else if (p.idade >= 50) {
      const prev = { peso_min, peso_max, b: balance_preferido }
      peso_min = 315; peso_max = 325
      if (balance_preferido === 'medio_ou_cabeca') balance_preferido = 'medio'
      balance_preferido = balance_preferido === 'medio' ? 'medio_ou_cabo' : balance_preferido
      if (!dor) prioridades = ['conforto', 'sweet spot generoso', ...prioridades]
      steps.push({ label: '+ idade 50–64 (override conforto)', result: { peso_min, peso_max, balance: balance_preferido }, note: `${prev.peso_min}–${prev.peso_max}g → 315–325g`, isOverride: true })
    } else if (p.idade >= 13 && p.idade <= 17) {
      const prevMax = peso_max
      peso_max = peso_min + 10
      steps.push({ label: `+ adolescente ${p.idade} anos (teto min+10)`, result: { peso_min, peso_max }, note: `max ${prevMax} → ${peso_max}g` })
    }
  }

  if (p.jogo_aereo_predominante) {
    const prev = { peso_min, peso_max }
    peso_min -= 5; peso_max -= 5
    steps.push({ label: '+ jogo aéreo predominante (−5g)', result: { peso_min, peso_max }, note: `${prev.peso_min}–${prev.peso_max} → ${peso_min}–${peso_max}g` })
  }

  if (dor) {
    const lesaoDesc = [p.cotovelo_sensivel && 'cotovelo', p.ombro_sensivel && 'ombro', p.punho_sensivel && 'punho'].filter(Boolean).join('+')
    if (balance_preferido === 'medio_ou_cabeca') conflitos.push(`lesão (${lesaoDesc}) + balance cabeça: balance excluído por lesão`)

    // All injuries: profile-driven range capped at 315–335g.
    // Mass absorbs impact; very light forces the arm to generate power, worsening symptoms.
    if (porte_grande) conflitos.push(`lesão (${lesaoDesc}) + porte grande: porte elevou o peso; teto modulado para 335g`)
    if (p.estilo === 'ofensivo') conflitos.push(`lesão (${lesaoDesc}) + estilo ofensivo: faixa ofensiva contida em ≤335g, balance cabeça excluído`)
    const prev = { peso_min, peso_max, b: balance_preferido }
    peso_min = Math.max(315, Math.min(peso_min, 330))
    peso_max = 335
    if (balance_preferido === 'medio_ou_cabeca') balance_preferido = 'medio'
    prioridades = ['conforto', 'estabilidade', 'sweet spot generoso', 'manuseio']
    steps.push({ label: `+ LESÃO (${lesaoDesc}) ─ faixa modulada 315–335g`, result: { peso_min, peso_max, balance: balance_preferido }, note: `${prev.peso_min}–${prev.peso_max}g → ${peso_min}–${peso_max}g (perfil mantido, teto 335g; massa amortece impacto)`, isOverride: true })
  }

  const hasOverride = (p.idade != null && p.idade >= 50) || !!dor
  if (!hasOverride) {
    const MIN_WINDOW = 15
    if (peso_max - peso_min < MIN_WINDOW) {
      const prevMax = peso_max
      peso_max = peso_min + MIN_WINDOW
      steps.push({ label: `+ janela mínima ${MIN_WINDOW}g`, result: { peso_min, peso_max }, note: `max ${prevMax} → ${peso_max}g (variação fabril ±10g exige janela ≥${MIN_WINDOW}g)` })
    }
  }

  const preClamp = { peso_min, peso_max }
  peso_min = Math.max(peso_min, CATALOGO_FLOOR)
  peso_max = Math.max(peso_max, CATALOGO_FLOOR + 5)
  if (peso_min > peso_max) peso_max = peso_min + 5
  if (peso_min !== preClamp.peso_min || peso_max !== preClamp.peso_max) {
    steps.push({ label: '+ clamp floor (min catálogo 315g)', result: { peso_min, peso_max }, note: `${preClamp.peso_min}–${preClamp.peso_max} → ${peso_min}–${peso_max}g` })
  }

  return { faixa: { peso_min, peso_max, balance_preferido, prioridades }, trace: { steps, conflitos } }
}

// Classifica o nível predominante de uma raquete pela zona de gap entre scores.
// gap > +4 → avançado, gap < -4 → iniciante, entre → intermediário.
export function clasificarNivel(
  scoreAva: number,
  scoreIni: number,
): 'iniciante' | 'intermediario' | 'avancado' {
  const gap = scoreAva - scoreIni
  if (gap > 4) return 'avancado'
  if (gap < -4) return 'iniciante'
  return 'intermediario'
}

export function computeScorerWeights(profile: ScorerProfile): Record<string, number> {
  const w = applyModifiers(baseWeights(profile), profile)
  const all: Record<string, number> = {
    potência: w.power,
    controle: w.control,
    conforto: w.comfort,
    manuseio: w.maneuverability,
    spin: w.spin,
    estabilidade: w.stability,
    'sweet spot': w.forgiveness,
  }
  return Object.fromEntries(Object.entries(all).filter(([, v]) => v > 0))
}
