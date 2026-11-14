/**
 * Insight de comparação — plantilla determinística, sem IA em tempo real.
 * Pega os 7 scores de racket_insights, acha a categoria com maior diferença,
 * e explica o "porquê" lendo os fatores reais do calcularMotorTrace (face/core/
 * furos/espessura/peso). Mesma lógica validada manualmente em 8 pares reais.
 */
import { calcularMotorTrace, type MotorDim, type MotorTrace, type MotorTraceDim } from './motor'
import type { RacketWithInsights } from './recommend'

type Tecnologia = { nome: string; tipo: string }

export const DIM_LABEL_PT: Record<MotorDim, string> = {
  power: 'potência',
  control: 'controle',
  comfort: 'conforto',
  maneuverability: 'manuseio',
  stability: 'estabilidade',
  spin: 'spin',
  forgiveness: 'sweet spot',
}

// Ordem de desempate quando duas categorias têm a mesma diferença — mais
// "legível"/acionável primeiro.
const DIM_PRIORITY: MotorDim[] = ['control', 'power', 'comfort', 'maneuverability', 'forgiveness', 'spin', 'stability']

function motorInput(r: RacketWithInsights) {
  const sx = (r.specs_extra ?? {}) as Record<string, unknown>
  return {
    superficie: (sx.superficie as string | undefined) ?? null,
    furos: (sx.furos as number | undefined) ?? null,
    espessura_mm: (sx.espessura_mm as number | undefined) ?? null,
    tecnologias: (sx.tecnologias as Tecnologia[] | undefined) ?? [],
    face_material: r.face_material,
    core: r.core,
    weight_g: r.weight_g,
    balance: r.balance,
  }
}

function num(v: number | string): number {
  return typeof v === 'number' ? v : parseFloat(v)
}

function factorType(label: string): string {
  const br = label.indexOf('[')
  const pa = label.indexOf('(')
  const cut = br >= 0 ? br : pa >= 0 ? pa : label.length
  return label.slice(0, cut).trim()
}

// Dado o trace de um dimensão para o vencedor e o perdedor, acha qual fator
// (face, core, furos, esp, peso...) mais explica a diferença entre os dois.
function dominantFactor(rowsWinner: MotorTraceDim, rowsLoser: MotorTraceDim): string | null {
  const usable = rowsWinner.filter(r => !r.isFinal && r.label !== 'base')
  let best: { type: string; delta: number } | null = null
  for (const rw of usable) {
    const type = factorType(rw.label)
    const rl = rowsLoser.find(r => factorType(r.label) === type)
    if (!rl) continue
    const delta = num(rw.value) - num(rl.value)
    if (delta === 0) continue
    if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { type, delta }
  }
  return best?.type ?? null
}

function techNames(r: RacketWithInsights, tipos: string[]): string {
  const sx = (r.specs_extra ?? {}) as Record<string, unknown>
  const techs = (sx.tecnologias as Tecnologia[] | undefined) ?? []
  const names = techs.filter(t => tipos.includes(t.tipo)).map(t => t.nome)
  return names.length > 0 ? names.slice(0, 2).join(' + ') : 'tecnologia antivibração'
}

function dirEsp(winner: RacketWithInsights, loser: RacketWithInsights): string {
  const w = (winner.specs_extra as Record<string, unknown> | null)?.espessura_mm as number | undefined
  const l = (loser.specs_extra as Record<string, unknown> | null)?.espessura_mm as number | undefined
  if (w == null || l == null) return 'espessura diferente'
  return w < l ? `núcleo mais fino (${w}mm vs. ${l}mm)` : `núcleo mais grosso (${w}mm vs. ${l}mm)`
}

function dirFuros(winner: RacketWithInsights, loser: RacketWithInsights): string {
  const w = (winner.specs_extra as Record<string, unknown> | null)?.furos as number | undefined
  const l = (loser.specs_extra as Record<string, unknown> | null)?.furos as number | undefined
  if (w == null || l == null) return 'furação diferente'
  return w < l ? `menos furos (${w} vs. ${l})` : `mais furos (${w} vs. ${l})`
}

function dirPeso(winner: RacketWithInsights, loser: RacketWithInsights): string {
  const w = winner.weight_g, l = loser.weight_g
  if (w == null || l == null) return 'peso diferente'
  return w < l ? `peso mais baixo (${w}g vs. ${l}g)` : `peso mais alto (${w}g vs. ${l}g)`
}

type PhraseFn = (winner: RacketWithInsights, loser: RacketWithInsights) => string

const PHRASES: Partial<Record<MotorDim, Record<string, PhraseFn>>> = {
  power: {
    FACE_POWER: (w, l) => `face ${w.face_material} transfere mais potência que a ${l.face_material}`,
    CORE_POWER: (w, l) => `núcleo ${w.core} entrega mais potência que o ${l.core}`,
    'balance cabeça': () => `balance de cabeça pesada soma potência extra`,
  },
  control: {
    FACE_CTRL: (w, l) => `face ${w.face_material} (mais flexível) dá mais controle que a ${l.face_material}`,
    CORE_CTRL: (w, l) => `núcleo ${w.core} (mais macio) favorece o controle frente ao ${l.core}`,
    furos: (w, l) => `${dirFuros(w, l)} rendem mais precisão na resposta`,
    esp: (w, l) => `${dirEsp(w, l)} rende mais controle`,
    peso: (w, l) => `${dirPeso(w, l)} favorece o controle`,
  },
  stability: {
    FACE_STAB: (w, l) => `face ${w.face_material} soma mais estabilidade que a ${l.face_material}`,
    peso: (w, l) => `${dirPeso(w, l)} estabiliza mais a batida`,
    estrutural: w => `tecnologia estrutural (${techNames(w, ['estrutural'])}) reforça a estabilidade`,
    esp: (w, l) => `${dirEsp(w, l)} muda o comportamento na batida`,
  },
  maneuverability: {
    esp: (w, l) => `${dirEsp(w, l)} deixa o swing mais rápido`,
    peso: (w, l) => `${dirPeso(w, l)} facilita o manuseio`,
    furos: (w, l) => `${dirFuros(w, l)} aliviam o swing`,
  },
  forgiveness: {
    FACE_FORG: (w, l) => `face ${w.face_material} perdoa mais o toque fora do centro que a ${l.face_material}`,
    CORE_FORG: (w, l) => `núcleo ${w.core} amplia a margem de erro frente ao ${l.core}`,
    esp: (w, l) => `${dirEsp(w, l)} amplia a margem de erro`,
  },
  comfort: {
    CORE_COMFORT: (w, l) => `núcleo ${w.core} absorve mais o impacto que o ${l.core}`,
    antivib: w => `tecnologias antivibração (${techNames(w, ['antivibracao', 'antivibração'])}) absorvem o impacto`,
    FACE_COMFORT: (w, l) => `face ${w.face_material} é mais macia ao toque que a ${l.face_material}`,
    esp: (w, l) => `${dirEsp(w, l)} absorve mais o impacto`,
    peso: (w, l) => `${dirPeso(w, l)} cansa menos o braço`,
  },
  spin: {
    textura: (w, l) => {
      const ws = (w.specs_extra as Record<string, unknown> | null)?.superficie as string | undefined
      const ls = (l.specs_extra as Record<string, unknown> | null)?.superficie as string | undefined
      return `superfície ${ws ?? 'mais áspera'} morde mais a bola que a ${ls ?? 'da outra'}`
    },
  },
}

const FALLBACK_REASON = 'specs distintas entre as duas raquetes'

function reasonFor(dim: MotorDim, winner: RacketWithInsights, loser: RacketWithInsights, traceWinner: MotorTrace, traceLoser: MotorTrace): string {
  const type = dominantFactor(traceWinner[dim], traceLoser[dim])
  const fn = type ? PHRASES[dim]?.[type] : null
  const text = fn ? fn(winner, loser) : null
  // specs faltantes (face_material/core nulo etc.) nunca viram "null" visível pro usuário
  if (!text || /\bnull\b|\bundefined\b/.test(text)) return FALLBACK_REASON
  return text
}

export interface CompareInsight {
  sentence1: string
  sentence2: string | null
}

export function buildCompareInsight(a: RacketWithInsights, b: RacketWithInsights): CompareInsight | null {
  const insA = a.racket_insights
  const insB = b.racket_insights
  if (!insA || !insB) return null

  const diffs: Partial<Record<MotorDim, number>> = {}
  for (const dim of DIM_PRIORITY) {
    const va = insA[dim] as number | null
    const vb = insB[dim] as number | null
    if (va == null || vb == null) continue
    diffs[dim] = va - vb
  }

  const dims = Object.keys(diffs) as MotorDim[]
  if (dims.length === 0) return null

  let dim1: MotorDim | null = null
  let maxAbs = 0
  for (const dim of DIM_PRIORITY) {
    const d = diffs[dim]
    if (d == null) continue
    if (Math.abs(d) > maxAbs) { maxAbs = Math.abs(d); dim1 = dim }
  }
  if (!dim1 || maxAbs === 0) return null

  const diff1 = diffs[dim1]!
  const winner1 = diff1 > 0 ? a : b
  const loser1 = diff1 > 0 ? b : a
  const traceA = calcularMotorTrace(motorInput(a))
  const traceB = calcularMotorTrace(motorInput(b))
  const traceWinner1 = diff1 > 0 ? traceA : traceB
  const traceLoser1 = diff1 > 0 ? traceB : traceA

  const scoreW1 = (winner1.racket_insights![dim1] as number)
  const scoreL1 = (loser1.racket_insights![dim1] as number)
  const sentence1 = `${winner1.name} leva vantagem em ${DIM_LABEL_PT[dim1]} (${scoreW1} vs. ${scoreL1}) — ${reasonFor(dim1, winner1, loser1, traceWinner1, traceLoser1)}.`

  // Segunda categoria: maior diferença entre as restantes que favoreça quem perdeu a primeira.
  let dim2: MotorDim | null = null
  let maxAbs2 = 0
  for (const dim of DIM_PRIORITY) {
    if (dim === dim1) continue
    const d = diffs[dim]
    if (d == null) continue
    const favoraLoser1 = (diff1 > 0 && d < 0) || (diff1 < 0 && d > 0)
    if (!favoraLoser1) continue
    if (Math.abs(d) > maxAbs2) { maxAbs2 = Math.abs(d); dim2 = dim }
  }

  if (!dim2) return { sentence1, sentence2: null }

  const diff2 = diffs[dim2]!
  const winner2 = diff2 > 0 ? a : b // === loser1
  const loser2 = diff2 > 0 ? b : a // === winner1
  const traceWinner2 = diff2 > 0 ? traceA : traceB
  const traceLoser2 = diff2 > 0 ? traceB : traceA
  const scoreW2 = (winner2.racket_insights![dim2] as number)
  const scoreL2 = (loser2.racket_insights![dim2] as number)
  const sentence2 = `${winner2.name} compensa com ${DIM_LABEL_PT[dim2]} (${scoreW2} vs. ${scoreL2}): ${reasonFor(dim2, winner2, loser2, traceWinner2, traceLoser2)}.`

  return { sentence1, sentence2 }
}
