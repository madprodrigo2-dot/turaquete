import { RacketWithInsights } from './recommend'

// Fórmula canônica de nível — fonte única de verdade.
// nivel_override (DB) vence apenas quando preenchido com motivo registrado (exceção auditável).
// isAvancadaParaFiltro (recommend.ts) usa thresholds distintos — perguntas diferentes por design.
export function derivarNivel(
  racket: RacketWithInsights
): 'iniciante' | 'intermediario' | 'avancado' | null {
  const ins = racket.racket_insights
  if (!ins) return null

  const f  = ins.forgiveness
  const p  = ins.power
  const c  = ins.control
  const co = ins.comfort

  let formula: 'iniciante' | 'intermediario' | 'avancado' | null = null
  if (f != null && p != null && c != null && co != null) {
    if (f <= 4 || (f <= 6 && (p >= 7 || c >= 7)) || (f <= 7 && p >= 9)) formula = 'avancado'
    else if (f >= 7 && co >= 6 && p <= 6) formula = 'iniciante'
    else formula = 'intermediario'
  }

  // Override editorial: só existe quando admin registrou motivo explícito
  return ins.nivel_override ?? formula
}
