type Tecnologia = { nome: string; tipo: string }

export interface MotorInput {
  superficie?: string | null
  furos?: number | null
  espessura_mm?: number | null
  tecnologias?: Tecnologia[]
}

export interface MotorResult {
  spin: number
  comfort: number
  stability: number
}

// Dimensions covered by a formula — others preserve current value
export const MOTOR_DIMS = ['spin', 'comfort', 'stability'] as const
export type MotorDim = (typeof MOTOR_DIMS)[number]

function texturaScore(superficie: string | null | undefined, hasSpinTech: boolean): number {
  if (!superficie) return 5
  const s = superficie.toLowerCase()
  if (s.includes('lisa')) return hasSpinTech ? 6 : 4
  if (s.includes('levemente')) return hasSpinTech ? 7 : 5
  if (s.includes('áspera') || s.includes('aspera') || s.includes('quartzo')) {
    return hasSpinTech ? 9 : 7
  }
  return 5
}

function furosScore(furos: number | null | undefined): number {
  if (furos == null) return 5
  if (furos <= 20) return 2
  if (furos <= 28) return 4
  if (furos <= 32) return 5
  if (furos <= 36) return 6
  if (furos <= 40) return 7
  return 8
}

// spin contribution: fino(≤20)→4, médio(≤22)→5, grosso(≥23)→6, null→5 (neutral)
function espessuraScore(mm: number | null | undefined): number {
  if (mm == null) return 5
  if (mm <= 20) return 4
  if (mm <= 22) return 5
  return 6
}

// stability modifier: fino reduces rigidity (-1), grosso increases it (+1)
function espessuraStabilityMod(mm: number | null | undefined): number {
  if (mm == null) return 0
  if (mm <= 20) return -1
  if (mm <= 22) return 0
  return 1
}

export function calcularMotor(input: MotorInput): MotorResult {
  const techs = input.tecnologias ?? []
  const hasSpinTech = techs.some(t => t.tipo === 'superficie')
  const antivibCount = techs.filter(
    t => t.tipo === 'antivibração' || t.tipo === 'antivibracao'
  ).length
  const estruturalCount = techs.filter(t => t.tipo === 'estrutural').length

  const ts = texturaScore(input.superficie, hasSpinTech)
  const fs = furosScore(input.furos)
  const es = espessuraScore(input.espessura_mm)
  const spin = Math.round(0.7 * ts + 0.15 * fs + 0.15 * es)

  // Comfort: antivib anchor — 0 systems→5, 1→8, 2+→9
  const comfort = antivibCount === 0 ? 5 : antivibCount === 1 ? 8 : 9

  // Stability: estrutural anchor + espessura modifier (fino→-1, grosso→+1)
  const stabilityBase = estruturalCount === 0 ? 5 : estruturalCount === 1 ? 7 : 9
  const stability = Math.min(10, Math.max(1, stabilityBase + espessuraStabilityMod(input.espessura_mm)))

  return { spin, comfort, stability }
}
