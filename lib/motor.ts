import { getSweetSpotCategory } from './sweetSpot'
import {
  type FaceGrade, type CoreClass,
  FACE_POWER, CORE_POWER,
  CORE_CTRL, FACE_CTRL,
  FACE_STAB,
  FACE_FORG, CORE_FORG,
  CORE_COMFORT, FACE_COMFORT,
} from './motorTables'

type Tecnologia = { nome: string; tipo: string }

export interface MotorInput {
  superficie?: string | null
  furos?: number | null
  espessura_mm?: number | null
  tecnologias?: Tecnologia[]
  face_material?: string | null
  core?: string | null
  weight_g?: number | null
  balance?: string | null
}

export interface MotorResult {
  spin: number
  comfort: number
  stability: number
  power: number
  control: number
  maneuverability: number
  forgiveness: number
  saida_de_bola: 'fácil' | 'média' | 'exigente'
  sweet_spot: 'grande' | 'médio' | 'pequeno'
}

export const MOTOR_DIMS = [
  'spin', 'comfort', 'stability',
  'power', 'control', 'maneuverability', 'forgiveness',
] as const
export type MotorDim = (typeof MOTOR_DIMS)[number]

// ── Classificação de materiais ────────────────────────────────────────────────

export function classifyFace(face: string | null | undefined): FaceGrade {
  const f = (face || '').toLowerCase()
  // HYBRID_VIDRO antes de VIDRO — "Carbono + Fibra de Vidro" contém "fibra de vidro"
  if (f.includes('carbono + fibra') || f.includes('3k + fibra') || f.includes('bio-based')) return 'HYBRID_VIDRO'
  if (f.includes('fibra de vidro') || f.includes('fiberglass')) return 'VIDRO'
  if (f.includes('kevlar') && !f.includes('carbon') && !f.includes('carbono')) return 'KEVLAR_PURE'
  if (f.includes('kevlar') && (f.includes('carbon') || f.includes('carbono'))) return 'KEVLAR_CARBON'
  if (f.includes('18k') || f.includes('21k') || f.includes('forjado') || f.includes('forged')) return 'CARBON_18K'
  if (f.includes('24k') || f.includes('triaxial')) return 'CARBON_24K'
  if (f.includes('12k') || f.includes('15k') || f.includes('16k')) return 'CARBON_6K_15K'
  if (f.includes('6k')) return 'CARBON_6K'
  if (
    f.includes('titanio') || f.includes('titanium') || f.includes('titânio') ||
    f.includes('metal fusion') || f.includes('silver') || f.includes('mft') ||
    f.includes('aluminizado')
  ) return 'CARBON_3K_METAL'
  return 'CARBON_3K'
}

export function classifyCore(core: string | null | undefined): CoreClass {
  const c = (core || '').toLowerCase()
  if (!core) return 'MEDIUM'
  if (
    c.includes('supersoft') || c.includes('extra soft') || c.includes('extrasoft') ||
    c.includes('special extrasoft')
  ) return 'SUPERSOFT'
  if (c.includes('branco') || c.includes('white')) return 'SUPERSOFT'
  if (c === 'eva 10' || c === 'eva 13') return 'SUPERSOFT'
  if (c.includes('hard') || c.includes('duro') || c.includes('high density') || c.includes('alta densidade')) return 'HARD'
  if (c.includes('black pro') || c.startsWith('black pro')) return 'HARD'
  if (c === 'eva15' || c === 'eva 15') return 'SOFT'
  if (c.includes('soft') || c.includes('active')) return 'SOFT'
  if (c.includes('medium')) return 'MEDIUM'
  return 'MEDIUM'
}

// ── Helpers spin (inalterados) ────────────────────────────────────────────────

function texturaScore(superficie: string | null | undefined, hasSpinTech: boolean): number {
  if (!superficie) return 5
  const s = superficie.toLowerCase()
  // Teto de fábrica: 7 (medio). Alto (9) reservado para tratamento em loja, nunca automático.
  if (s.includes('lisa')) return hasSpinTech ? 5 : 3
  if (s.includes('levemente')) return hasSpinTech ? 7 : 5
  if (s.includes('áspera') || s.includes('aspera') || s.includes('quartzo')) return 7
  return 5
}

// ── Motor principal ───────────────────────────────────────────────────────────

export function calcularMotor(input: MotorInput): MotorResult {
  const techs = input.tecnologias ?? []
  const hasSpinTech = techs.some(t => t.tipo === 'superficie' || t.tipo === 'spin')
  const antivibCount = techs.filter(t => t.tipo === 'antivibração' || t.tipo === 'antivibracao').length

  // Spin — driver único: textura da superfície
  const spin = texturaScore(input.superficie, hasSpinTech)

  // Classificações
  const faceGrade = classifyFace(input.face_material)
  const coreClass = classifyCore(input.core)
  const furos = input.furos ?? null
  const esp   = input.espessura_mm ?? null
  const wg    = input.weight_g ?? null
  const bal   = (input.balance || '').toLowerCase()

  // Stability — face + peso + estrutural + espessura
  const estruturalCount = techs.filter(t => t.tipo === 'estrutural').length
  const structBonus = estruturalCount >= 1 ? 1 : 0
  const pesoMod = (wg != null && wg > 340) ? 1 : 0
  const espMod  = esp == null ? 0 : esp <= 20 ? -1 : esp <= 22 ? 0 : 1
  const stability = Math.min(9, Math.max(5,
    5 + (FACE_STAB[faceGrade] ?? 0) + pesoMod + structBonus + espMod
  ))

  // Power — face é o driver dominante; core duro acrescenta, supersoft absorve
  let power = FACE_POWER[faceGrade]
  if (bal.includes('pesada para a cabeça')) power += 1
  power += CORE_POWER[coreClass]
  power = Math.min(10, Math.max(1, power))

  // Control — núcleo macio = mais dwell time/perdão (mais controle); rígido = rebote rápido (menos controle)
  // Face flexível (3K, 6K) = mais controle; face rígida (18K/24K) = potência, não controle
  let control = 4
  control += CORE_CTRL[coreClass]
  control += FACE_CTRL[faceGrade] ?? 0
  if (furos != null && furos >= 42) control -= 1
  if (furos != null && furos <= 20) control += 1
  if (wg != null && wg > 340) control -= 1
  if (esp != null && esp <= 20) control += 2
  if (esp != null && esp === 21) control += 1
  if (esp != null && esp >= 23) control -= 2
  control = Math.min(10, Math.max(1, control))

  // Maneuverability — espessura + peso recalibrado (sem bônus de face)
  let man = 7
  if (esp != null && esp <= 20) man += 1
  if (esp != null && esp >= 23) man -= 1
  if (wg != null && wg >= 340) man -= 1   // só raquetes deliberadamente pesadas penalizam
  if (furos != null && furos >= 40) man += 1
  if (furos != null && furos <= 20) man -= 1
  const maneuverability = Math.min(10, Math.max(1, man))

  // Forgiveness — face grade + core softness + redonda(+1) + espessura
  let forg = 4
  forg += FACE_FORG[faceGrade]
  forg += CORE_FORG[coreClass]
  forg += 1  // formato sempre redonda
  if (esp != null && esp >= 22) forg += 1
  if (esp != null && esp <= 20) forg -= 1
  // Faces muito rígidas (18K/24K) não são muito forgiving mesmo com core soft
  if (faceGrade === 'CARBON_18K' || faceGrade === 'CARBON_24K') forg = Math.min(7, forg)
  const forgiveness = Math.min(10, Math.max(1, forg))

  // Comfort — núcleo é o driver principal; antivib é bônus encima
  let comfort = 5
  comfort += CORE_COMFORT[coreClass]
  comfort += Math.min(antivibCount, 2)
  comfort += FACE_COMFORT[faceGrade] ?? 0
  if (esp != null && esp <= 20) comfort -= 1
  if (esp != null && esp >= 23) comfort += 1
  if (wg != null && wg >= 340) comfort -= 1
  comfort = Math.min(10, Math.max(1, comfort))

  const delta = comfort - power
  const saida_de_bola: 'fácil' | 'média' | 'exigente' =
    delta >= 2 ? 'fácil' : delta <= -2 ? 'exigente' : 'média'

  const sweet_spot = getSweetSpotCategory(forgiveness)!

  return { spin, comfort, stability, power, control, maneuverability, forgiveness, saida_de_bola, sweet_spot }
}

// ── Trace (admin debug) ───────────────────────────────────────────────────────

export type MotorTraceDim = { label: string; value: number | string; isBase?: boolean; isFinal?: boolean; note?: string }[]

export type MotorTrace = {
  fg: string
  cc: string
  power: MotorTraceDim
  control: MotorTraceDim
  stability: MotorTraceDim
  maneuverability: MotorTraceDim
  forgiveness: MotorTraceDim
  comfort: MotorTraceDim
  spin: MotorTraceDim
}

export function calcularMotorTrace(input: MotorInput): MotorTrace {
  const techs = input.tecnologias ?? []
  const hasSpinTech = techs.some(t => t.tipo === 'superficie' || t.tipo === 'spin')
  const antivibCount = techs.filter(t => t.tipo === 'antivibração' || t.tipo === 'antivibracao').length
  const estruturalCount = techs.filter(t => t.tipo === 'estrutural').length

  const faceGrade = classifyFace(input.face_material)
  const coreClass = classifyCore(input.core)
  const furos = input.furos ?? null
  const esp   = input.espessura_mm ?? null
  const wg    = input.weight_g ?? null
  const bal   = (input.balance || '').toLowerCase()

  const balBonus = bal.includes('pesada para a cabeça') ? 1 : 0
  const powerRaw = FACE_POWER[faceGrade] + balBonus + CORE_POWER[coreClass]
  const powerFinal = Math.min(10, Math.max(1, powerRaw))

  const ctrlEsp = esp == null ? 0 : esp <= 20 ? 2 : esp === 21 ? 1 : esp >= 23 ? -2 : 0
  const ctrlFuros = furos != null && furos >= 42 ? -1 : furos != null && furos <= 20 ? 1 : 0
  const ctrlPeso = wg != null && wg > 340 ? -1 : 0
  const ctrlRaw = 4 + (CORE_CTRL[coreClass]) + (FACE_CTRL[faceGrade] ?? 0) + ctrlFuros + ctrlPeso + ctrlEsp
  const controlFinal = Math.min(10, Math.max(1, ctrlRaw))

  const structBonus = estruturalCount >= 1 ? 1 : 0
  const stabPeso = wg != null && wg > 340 ? 1 : 0
  const stabEsp = esp == null ? 0 : esp <= 20 ? -1 : esp <= 22 ? 0 : 1
  const stabRaw = 5 + (FACE_STAB[faceGrade] ?? 0) + stabPeso + structBonus + stabEsp
  const stabilityFinal = Math.min(9, Math.max(5, stabRaw))

  const manEsp = esp != null && esp <= 20 ? 1 : esp != null && esp >= 23 ? -1 : 0
  const manPeso = wg != null && wg >= 340 ? -1 : 0
  const manFuros = furos != null && furos >= 40 ? 1 : furos != null && furos <= 20 ? -1 : 0
  const manRaw = 7 + manEsp + manPeso + manFuros
  const maneuverabilityFinal = Math.min(10, Math.max(1, manRaw))

  const forgEsp = esp != null && esp >= 22 ? 1 : esp != null && esp <= 20 ? -1 : 0
  let forgRaw = 4 + FACE_FORG[faceGrade] + CORE_FORG[coreClass] + 1 + forgEsp
  const forgCapped = (faceGrade === 'CARBON_18K' || faceGrade === 'CARBON_24K') && forgRaw > 7
  if (forgCapped) forgRaw = 7
  const forgivenessFinal = Math.min(10, Math.max(1, forgRaw))

  const comfEsp = esp != null && esp <= 20 ? -1 : esp != null && esp >= 23 ? 1 : 0
  const comfPeso = wg != null && wg >= 340 ? -1 : 0
  const comfAntivib = Math.min(antivibCount, 2)
  const comfRaw = 5 + CORE_COMFORT[coreClass] + comfAntivib + (FACE_COMFORT[faceGrade] ?? 0) + comfEsp + comfPeso
  const comfortFinal = Math.min(10, Math.max(1, comfRaw))

  const textura = texturaScore(input.superficie, hasSpinTech)
  const spinFinal = textura

  const fmt = (n: number) => n > 0 ? `+${n}` : `${n}`

  return {
    fg: faceGrade, cc: coreClass,
    power: [
      { label: `FACE_POWER[${faceGrade}]`, value: FACE_POWER[faceGrade], isBase: true },
      { label: 'balance cabeça', value: fmt(balBonus), note: balBonus === 0 ? 'não se aplica' : undefined },
      { label: `CORE_POWER[${coreClass}]`, value: fmt(CORE_POWER[coreClass]) },
      { label: 'resultado', value: powerFinal, isFinal: true, note: powerRaw !== powerFinal ? `clamp de ${powerRaw}` : undefined },
    ],
    control: [
      { label: 'base', value: 4, isBase: true },
      { label: `CORE_CTRL[${coreClass}]`, value: fmt(CORE_CTRL[coreClass]) },
      { label: `FACE_CTRL[${faceGrade}]`, value: fmt(FACE_CTRL[faceGrade] ?? 0), note: (FACE_CTRL[faceGrade] ?? 0) === 0 ? 'neutro' : undefined },
      { label: `furos (${furos ?? '?'})`, value: fmt(ctrlFuros), note: furos == null ? 'sem dado' : undefined },
      { label: `peso (${wg ?? '?'}g)`, value: fmt(ctrlPeso), note: ctrlPeso === 0 ? '≤340g, sem penalidade' : undefined },
      { label: `esp (${esp ?? '?'}mm)`, value: fmt(ctrlEsp) },
      { label: 'resultado', value: controlFinal, isFinal: true, note: ctrlRaw !== controlFinal ? `clamp de ${ctrlRaw}` : undefined },
    ],
    stability: [
      { label: 'base', value: 5, isBase: true },
      { label: `FACE_STAB[${faceGrade}]`, value: fmt(FACE_STAB[faceGrade] ?? 0) },
      { label: `peso (${wg ?? '?'}g)`, value: fmt(stabPeso), note: stabPeso === 0 ? '≤340g, sem bônus' : undefined },
      { label: `estrutural (${estruturalCount})`, value: fmt(structBonus), note: estruturalCount === 0 ? 'sem techs estruturais' : `${estruturalCount} tech(s) → bônus único` },
      { label: `esp (${esp ?? '?'}mm)`, value: fmt(stabEsp) },
      { label: 'resultado', value: stabilityFinal, isFinal: true, note: stabRaw !== stabilityFinal ? `clamp [5,9] de ${stabRaw}` : undefined },
    ],
    maneuverability: [
      { label: 'base', value: 7, isBase: true },
      { label: `esp (${esp ?? '?'}mm)`, value: fmt(manEsp) },
      { label: `peso (${wg ?? '?'}g)`, value: fmt(manPeso), note: manPeso === 0 ? '<340g, sem penalidade' : undefined },
      { label: `furos (${furos ?? '?'})`, value: fmt(manFuros) },
      { label: 'resultado', value: maneuverabilityFinal, isFinal: true, note: manRaw !== maneuverabilityFinal ? `clamp de ${manRaw}` : undefined },
    ],
    forgiveness: [
      { label: 'base', value: 4, isBase: true },
      { label: `FACE_FORG[${faceGrade}]`, value: fmt(FACE_FORG[faceGrade]) },
      { label: `CORE_FORG[${coreClass}]`, value: fmt(CORE_FORG[coreClass]) },
      { label: 'formato redonda', value: '+1' },
      { label: `esp (${esp ?? '?'}mm)`, value: fmt(forgEsp) },
      { label: 'resultado', value: forgivenessFinal, isFinal: true, note: forgCapped ? 'cap 7 para faces 18K/24K' : undefined },
    ],
    comfort: [
      { label: 'base', value: 5, isBase: true },
      { label: `CORE_COMFORT[${coreClass}]`, value: fmt(CORE_COMFORT[coreClass]) },
      { label: `antivib (${antivibCount} techs)`, value: fmt(comfAntivib), note: antivibCount > 2 ? 'cap em 2' : undefined },
      { label: `FACE_COMFORT[${faceGrade}]`, value: fmt(FACE_COMFORT[faceGrade] ?? 0), note: (FACE_COMFORT[faceGrade] ?? 0) === 0 ? 'neutro' : undefined },
      { label: `esp (${esp ?? '?'}mm)`, value: fmt(comfEsp) },
      { label: `peso (${wg ?? '?'}g)`, value: fmt(comfPeso), note: comfPeso === 0 ? '<340g, sem penalidade' : undefined },
      { label: 'resultado', value: comfortFinal, isFinal: true, note: comfRaw !== comfortFinal ? `clamp de ${comfRaw}` : undefined },
    ],
    spin: [
      { label: `textura (${input.superficie ?? '?'})`, value: textura, isBase: true, note: hasSpinTech ? 'com spin tech' : 'sem spin tech' },
      { label: 'resultado', value: spinFinal, isFinal: true },
    ],
  }
}
