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
}

export const MOTOR_DIMS = [
  'spin', 'comfort', 'stability',
  'power', 'control', 'maneuverability', 'forgiveness',
] as const
export type MotorDim = (typeof MOTOR_DIMS)[number]

// ── Classificação de materiais ────────────────────────────────────────────────

type FaceGrade =
  | 'VIDRO' | 'HYBRID_VIDRO' | 'KEVLAR_PURE' | 'KEVLAR_CARBON'
  | 'CARBON_3K' | 'CARBON_3K_METAL' | 'CARBON_6K_15K' | 'CARBON_24K' | 'CARBON_18K'

export function classifyFace(face: string | null | undefined): FaceGrade {
  const f = (face || '').toLowerCase()
  // HYBRID_VIDRO antes de VIDRO — "Carbono + Fibra de Vidro" contém "fibra de vidro"
  if (f.includes('carbono + fibra') || f.includes('3k + fibra') || f.includes('bio-based')) return 'HYBRID_VIDRO'
  if (f.includes('fibra de vidro') || f.includes('fiberglass')) return 'VIDRO'
  if (f.includes('kevlar') && !f.includes('carbon') && !f.includes('carbono')) return 'KEVLAR_PURE'
  if (f.includes('kevlar') && (f.includes('carbon') || f.includes('carbono'))) return 'KEVLAR_CARBON'
  if (f.includes('18k')) return 'CARBON_18K'
  if (f.includes('24k') || f.includes('triaxial')) return 'CARBON_24K'
  if (f.includes('12k') || f.includes('15k') || f.includes('16k') || f.includes('aluminizado')) return 'CARBON_6K_15K'
  if (f.includes('6k')) return 'CARBON_6K_15K'
  if (
    f.includes('titanio') || f.includes('titanium') || f.includes('titânio') ||
    f.includes('metal fusion') || f.includes('silver') || f.includes('mft')
  ) return 'CARBON_3K_METAL'
  return 'CARBON_3K'
}

type CoreClass = 'SUPERSOFT' | 'SOFT' | 'MEDIUM' | 'HARD'

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
  if (c.includes('soft')) return 'SOFT'   // pega "EVA Black Soft" antes do check de black
  if (c.includes('black')) return 'HARD'  // "EVA Black" puro
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

// Stability — B2+core: espesor + peso (320/330/340) + rigidez de cara + dureza do núcleo.
function stabilityB(
  espessura_mm: number | null | undefined,
  weight_g: number | null | undefined,
  face_material: string | null | undefined,
  core: string | null | undefined,
): number {
  const face    = (face_material || '').toLowerCase()
  const c       = (core || '').toLowerCase()
  const modEsp  = espessura_mm == null ? 1 : espessura_mm <= 20 ? 0 : espessura_mm <= 22 ? 1 : 2
  const modPeso = weight_g != null && weight_g >= 340 ? 1 : 0  // só raquetes deliberadamente pesadas
  const modRig  = /18k|21k|24k|forjado|forged|aluminizado/.test(face) ? 1 : 0
  const isSupersoft = /supersoft|extra soft|extrasoft|branco|white/.test(c) || core === 'EVA 10' || core === 'EVA 13'
  const isHard = !isSupersoft && (/hard|duro|high density|alta densidade/.test(c) || c.includes('black pro') || (!c.includes('soft') && c.includes('black')))
  const modCore = isSupersoft ? -1 : isHard ? 1 : 0
  return Math.min(9, Math.max(5, 5 + modEsp + modPeso + modRig + modCore))
}

// ── Motor principal ───────────────────────────────────────────────────────────

export function calcularMotor(input: MotorInput): MotorResult {
  const techs = input.tecnologias ?? []
  const hasSpinTech = techs.some(t => t.tipo === 'superficie' || t.tipo === 'spin')
  const antivibCount = techs.filter(t => t.tipo === 'antivibração' || t.tipo === 'antivibracao').length

  // Spin — driver único: textura da superfície
  const spin = texturaScore(input.superficie, hasSpinTech)

  // Stability — física: espesor + peso + rigidez de cara
  const stability = stabilityB(input.espessura_mm, input.weight_g, input.face_material, input.core)

  // Classificações
  const faceGrade = classifyFace(input.face_material)
  const coreClass = classifyCore(input.core)
  const furos = input.furos ?? null
  const esp   = input.espessura_mm ?? null
  const wg    = input.weight_g ?? null
  const bal   = (input.balance || '').toLowerCase()

  // Power — face é o driver dominante; core duro acrescenta, supersoft absorve
  const FACE_POWER: Record<FaceGrade, number> = {
    VIDRO: 4, HYBRID_VIDRO: 5,
    KEVLAR_PURE: 6, CARBON_3K: 6,
    KEVLAR_CARBON: 7, CARBON_3K_METAL: 7,
    CARBON_6K_15K: 8,
    CARBON_24K: 9, CARBON_18K: 9,
  }
  const CORE_POWER: Record<CoreClass, number> = { SUPERSOFT: -1, SOFT: 0, MEDIUM: 0, HARD: +1 }
  let power = FACE_POWER[faceGrade]
  if (bal.includes('pesada para a cabeça')) power += 1
  power += CORE_POWER[coreClass]
  power = Math.min(10, Math.max(1, power))

  // Control — firme = preciso, suave = disperso (invertido em relação a forgiveness)
  const CORE_CTRL: Record<CoreClass, number> = { SUPERSOFT: -2, SOFT: -1, MEDIUM: 0, HARD: +1 }
  const FACE_CTRL: Partial<Record<FaceGrade, number>> = { CARBON_18K: +1, CARBON_24K: +1 }
  let control = 5
  control += CORE_CTRL[coreClass]
  control += FACE_CTRL[faceGrade] ?? 0
  if (furos != null && furos >= 40) control -= 1
  if (furos != null && furos <= 20) control += 1
  if (wg != null && wg > 340) control -= 1
  if (esp != null && esp <= 20) control += 2   // frame fino = muito mais feel/controle do atleta
  if (esp != null && esp >= 23) control -= 2   // frame grosso = potência, sacrifica precisão
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
  const FACE_FORG: Record<FaceGrade, number> = {
    VIDRO: +3, HYBRID_VIDRO: +2, KEVLAR_PURE: +1, KEVLAR_CARBON: 0,
    CARBON_3K: 0, CARBON_3K_METAL: 0, CARBON_6K_15K: 0,
    CARBON_24K: -1, CARBON_18K: -1,
  }
  const CORE_FORG: Record<CoreClass, number> = { SUPERSOFT: +2, SOFT: +1, MEDIUM: 0, HARD: -1 }
  let forg = 3
  forg += FACE_FORG[faceGrade]
  forg += CORE_FORG[coreClass]
  forg += 1  // formato sempre redonda
  if (esp != null && esp >= 22) forg += 1
  if (esp != null && esp <= 20) forg -= 1
  // Faces muito rígidas (18K/24K) não são muito forgiving mesmo com core soft
  if (faceGrade === 'CARBON_18K' || faceGrade === 'CARBON_24K') forg = Math.min(7, forg)
  const forgiveness = Math.min(10, Math.max(1, forg))

  // Comfort — núcleo é o driver principal; antivib é bônus encima
  const CORE_COMFORT: Record<CoreClass, number> = { SUPERSOFT: +2, SOFT: +1, MEDIUM: 0, HARD: -2 }
  let comfort = 6
  comfort += CORE_COMFORT[coreClass]
  comfort += Math.min(antivibCount, 2)
  if (faceGrade === 'VIDRO' || faceGrade === 'HYBRID_VIDRO') comfort += 1
  if (faceGrade === 'KEVLAR_PURE' || faceGrade === 'KEVLAR_CARBON') comfort += 1
  comfort = Math.min(10, Math.max(1, comfort))

  return { spin, comfort, stability, power, control, maneuverability, forgiveness }
}
