import { RacketWithInsights } from './recommend'

// V2 formula — fórmula derivada dos 4 scores principais.
// avancado : (f ≤ 6 e potente/preciso) OU (f = 7 e p = 9+)
// iniciante: f ≥ 9 e confortável e não agressiva
// intermediario: tudo o mais
// NULL: scores insuficientes → usa nivel_sugerido armazenado
export function derivarNivel(
  racket: RacketWithInsights
): 'iniciante' | 'intermediario' | 'avancado' | null {
  const ins = racket.racket_insights
  if (!ins) return null

  const f  = ins.forgiveness
  const p  = ins.power
  const c  = ins.control
  const co = ins.comfort

  if (f == null || p == null || c == null || co == null) {
    return ins.nivel_sugerido ?? null
  }

  if ((f <= 6 && (p >= 8 || c >= 8)) || (f <= 7 && p >= 9)) return 'avancado'
  if (f >= 9 && co >= 7 && p <= 6) return 'iniciante'
  return 'intermediario'
}
