import { RacketWithInsights } from './recommend'

// nivel_sugerido (DB) é a fonte primária — já auditado e alinhado com derivarNivel formula.
// A fórmula abaixo serve só como fallback para raquetes sem nivel_sugerido (rascunho/sem insights).
export function derivarNivel(
  racket: RacketWithInsights
): 'iniciante' | 'intermediario' | 'avancado' | null {
  const ins = racket.racket_insights
  if (!ins) return null

  if (ins.nivel_sugerido) return ins.nivel_sugerido

  // Fallback formula para raquetes sem nivel_sugerido
  const f  = ins.forgiveness
  const p  = ins.power
  const c  = ins.control
  const co = ins.comfort

  if (f == null || p == null || c == null || co == null) return null

  if (f <= 4 || (f <= 6 && (p >= 7 || c >= 7)) || (f <= 7 && p >= 9)) return 'avancado'
  if (f >= 7 && co >= 6 && p <= 6) return 'iniciante'
  return 'intermediario'
}
